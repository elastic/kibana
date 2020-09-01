/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';
import turfBbox from '@turf/bbox';
import { multiPoint } from '@turf/helpers';

import { UpdateSourceEditor } from './update_source_editor';
import { i18n } from '@kbn/i18n';
import { SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { convertToLines } from './convert_to_lines';
import { AbstractESAggSource, DEFAULT_METRIC } from '../es_agg_source';
import { registerSource } from '../source_registry';
import { turfBboxToBounds } from '../../../../common/elasticsearch_geo_utils';
import { DataRequestAbortError } from '../../util/data_request';

const MAX_GEOTILE_LEVEL = 29;

export const sourceTitle = i18n.translate('xpack.maps.source.pewPewTitle', {
  defaultMessage: 'Point to point',
});

export class ESPewPewSource extends AbstractESAggSource {
  static type = SOURCE_TYPES.ES_PEW_PEW;

  static createDescriptor({ indexPatternId, sourceGeoField, destGeoField, metrics }) {
    return {
      type: ESPewPewSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      sourceGeoField,
      destGeoField,
      metrics: metrics ? metrics : [DEFAULT_METRIC],
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        applyGlobalQuery={this._descriptor.applyGlobalQuery}
      />
    );
  }

  isFilterByMapBounds() {
    return true;
  }

  showJoinEditor() {
    return false;
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.LINE];
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
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldLabel', {
          defaultMessage: 'Source',
        }),
        value: this._descriptor.sourceGeoField,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.destGeoFieldLabel', {
          defaultMessage: 'Destination',
        }),
        value: this._descriptor.destGeoField,
      },
    ];
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + 2;
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', {
      destSplit: {
        terms: {
          script: {
            source: `doc['${this._descriptor.destGeoField}'].value.toString()`,
            lang: 'painless',
          },
          order: {
            _count: 'desc',
          },
          size: 100,
        },
        aggs: {
          sourceGrid: {
            geotile_grid: {
              field: this._descriptor.sourceGeoField,
              precision: searchFilters.geogridPrecision,
              size: 500,
            },
            aggs: {
              sourceCentroid: {
                geo_centroid: {
                  field: this._descriptor.sourceGeoField,
                },
              },
              ...this.getValueAggsDsl(indexPattern),
            },
          },
        },
      },
    });

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.pewPew.inspectorDescription', {
        defaultMessage: 'Source-destination connections request',
      }),
    });

    const { featureCollection } = convertToLines(esResponse);

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  getGeoFieldName() {
    return this._descriptor.destGeoField;
  }

  async getBoundsForFilters(boundsFilters, registerCancelCallback) {
    const searchSource = await this.makeSearchSource(boundsFilters, 0);
    searchSource.setField('aggs', {
      destFitToBounds: {
        geo_bounds: {
          field: this._descriptor.destGeoField,
        },
      },
      sourceFitToBounds: {
        geo_bounds: {
          field: this._descriptor.sourceGeoField,
        },
      },
    });

    const corners = [];
    try {
      const abortController = new AbortController();
      registerCancelCallback(() => abortController.abort());
      const esResp = await searchSource.fetch({ abortSignal: abortController.signal });
      if (esResp.aggregations.destFitToBounds.bounds) {
        corners.push([
          esResp.aggregations.destFitToBounds.bounds.top_left.lon,
          esResp.aggregations.destFitToBounds.bounds.top_left.lat,
        ]);
        corners.push([
          esResp.aggregations.destFitToBounds.bounds.bottom_right.lon,
          esResp.aggregations.destFitToBounds.bounds.bottom_right.lat,
        ]);
      }
      if (esResp.aggregations.sourceFitToBounds.bounds) {
        corners.push([
          esResp.aggregations.sourceFitToBounds.bounds.top_left.lon,
          esResp.aggregations.sourceFitToBounds.bounds.top_left.lat,
        ]);
        corners.push([
          esResp.aggregations.sourceFitToBounds.bounds.bottom_right.lon,
          esResp.aggregations.sourceFitToBounds.bounds.bottom_right.lat,
        ]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      return null;
    }

    if (corners.length === 0) {
      return null;
    }

    return turfBboxToBounds(turfBbox(multiPoint(corners)));
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }
}

registerSource({
  ConstructorFunction: ESPewPewSource,
  type: SOURCE_TYPES.ES_PEW_PEW,
});
