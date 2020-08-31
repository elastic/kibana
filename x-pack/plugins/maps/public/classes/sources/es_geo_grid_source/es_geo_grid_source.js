/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { convertCompositeRespToGeoJson, convertRegularRespToGeoJson } from './convert_to_geojson';
import { UpdateSourceEditor } from './update_source_editor';
import {
  SOURCE_TYPES,
  DEFAULT_MAX_BUCKETS_LIMIT,
  RENDER_AS,
  GRID_RESOLUTION,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource, DEFAULT_METRIC } from '../es_agg_source';
import { DataRequestAbortError } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { makeESBbox } from '../../../../common/elasticsearch_geo_utils';

export const MAX_GEOTILE_LEVEL = 29;

export const clustersTitle = i18n.translate('xpack.maps.source.esGridClustersTitle', {
  defaultMessage: 'Clusters and grids',
});

export const heatmapTitle = i18n.translate('xpack.maps.source.esGridHeatmapTitle', {
  defaultMessage: 'Heat map',
});

export class ESGeoGridSource extends AbstractESAggSource {
  static type = SOURCE_TYPES.ES_GEO_GRID;

  static createDescriptor({ indexPatternId, geoField, metrics, requestType, resolution }) {
    return {
      type: ESGeoGridSource.type,
      id: uuid(),
      indexPatternId,
      geoField,
      metrics: metrics ? metrics : [DEFAULT_METRIC],
      requestType,
      resolution: resolution ? resolution : GRID_RESOLUTION.COARSE,
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
        resolution={this._descriptor.resolution}
      />
    );
  }

  getSyncMeta() {
    return {
      requestType: this._descriptor.requestType,
    };
  }

  async getImmutableProperties() {
    let indexPatternTitle = this.getIndexPatternId();
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: this._descriptor.requestType === RENDER_AS.HEATMAP ? heatmapTitle : clustersTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.geospatialFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
    ];
  }

  getFieldNames() {
    return this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName());
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  showJoinEditor() {
    return false;
  }

  getGridResolution() {
    return this._descriptor.resolution;
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + this._getGeoGridPrecisionResolutionDelta();
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  _getGeoGridPrecisionResolutionDelta() {
    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      return 2;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      return 3;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      return 4;
    }

    throw new Error(
      i18n.translate('xpack.maps.source.esGrid.resolutionParamErrorMessage', {
        defaultMessage: `Grid resolution param not recognized: {resolution}`,
        values: {
          resolution: this._descriptor.resolution,
        },
      })
    );
  }

  async _compositeAggRequest({
    searchSource,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bucketsPerGrid,
    isRequestStillActive,
    bufferedExtent,
  }) {
    const gridsPerRequest = Math.floor(DEFAULT_MAX_BUCKETS_LIMIT / bucketsPerGrid);
    const aggs = {
      compositeSplit: {
        composite: {
          size: gridsPerRequest,
          sources: [
            {
              gridSplit: {
                geotile_grid: {
                  bounds: makeESBbox(bufferedExtent),
                  field: this._descriptor.geoField,
                  precision,
                },
              },
            },
          ],
        },
        aggs: {
          gridCentroid: {
            geo_centroid: {
              field: this._descriptor.geoField,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    };

    const features = [];
    let requestCount = 0;
    let afterKey = null;
    while (true) {
      if (!isRequestStillActive()) {
        // Stop paging through results if request is obsolete
        throw new DataRequestAbortError();
      }

      requestCount++;

      // circuit breaker to ensure reasonable number of requests
      if (requestCount > 5) {
        throw new Error(
          i18n.translate('xpack.maps.source.esGrid.compositePaginationErrorMessage', {
            defaultMessage: `{layerName} is causing too many requests. Reduce "Grid resolution" and/or reduce the number of top term "Metrics".`,
            values: { layerName },
          })
        );
      }

      if (afterKey) {
        aggs.compositeSplit.composite.after = afterKey;
      }
      searchSource.setField('aggs', aggs);
      const requestId = afterKey ? `${this.getId()} afterKey ${afterKey.geoSplit}` : this.getId();
      const esResponse = await this._runEsQuery({
        requestId,
        requestName: `${layerName} (${requestCount})`,
        searchSource,
        registerCancelCallback,
        requestDescription: i18n.translate(
          'xpack.maps.source.esGrid.compositeInspectorDescription',
          {
            defaultMessage: 'Elasticsearch geo grid aggregation request: {requestId}',
            values: { requestId },
          }
        ),
      });

      features.push(...convertCompositeRespToGeoJson(esResponse, this._descriptor.requestType));

      afterKey = esResponse.aggregations.compositeSplit.after_key;
      if (esResponse.aggregations.compositeSplit.buckets.length < gridsPerRequest) {
        // Finished because request did not get full resultset back
        break;
      }
    }

    return features;
  }

  // Do not use composite aggregation when there are no terms sub-aggregations
  // see https://github.com/elastic/kibana/pull/57875#issuecomment-590515482 for explanation on using separate code paths
  async _nonCompositeAggRequest({
    searchSource,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bufferedExtent,
  }) {
    searchSource.setField('aggs', {
      gridSplit: {
        geotile_grid: {
          bounds: makeESBbox(bufferedExtent),
          field: this._descriptor.geoField,
          precision,
          size: DEFAULT_MAX_BUCKETS_LIMIT,
          shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
        },
        aggs: {
          gridCentroid: {
            geo_centroid: {
              field: this._descriptor.geoField,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    });

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGrid.inspectorDescription', {
        defaultMessage: 'Elasticsearch geo grid aggregation request',
      }),
    });

    return convertRegularRespToGeoJson(esResponse, this._descriptor.requestType);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback, isRequestStillActive) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);

    let bucketsPerGrid = 1;
    this.getMetricFields().forEach((metricField) => {
      bucketsPerGrid += metricField.getBucketCount();
    });

    const features =
      bucketsPerGrid === 1
        ? await this._nonCompositeAggRequest({
            searchSource,
            indexPattern,
            precision: searchFilters.geogridPrecision,
            layerName,
            registerCancelCallback,
            bufferedExtent: searchFilters.buffer,
          })
        : await this._compositeAggRequest({
            searchSource,
            indexPattern,
            precision: searchFilters.geogridPrecision,
            layerName,
            registerCancelCallback,
            bucketsPerGrid,
            isRequestStillActive,
            bufferedExtent: searchFilters.buffer,
          });

    return {
      data: {
        type: 'FeatureCollection',
        features: features,
      },
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  isFilterByMapBounds() {
    return true;
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }

  async getSupportedShapeTypes() {
    if (this._descriptor.requestType === RENDER_AS.GRID) {
      return [VECTOR_SHAPE_TYPE.POLYGON];
    }

    return [VECTOR_SHAPE_TYPE.POINT];
  }
}

registerSource({
  ConstructorFunction: ESGeoGridSource,
  type: SOURCE_TYPES.ES_GEO_GRID,
});
