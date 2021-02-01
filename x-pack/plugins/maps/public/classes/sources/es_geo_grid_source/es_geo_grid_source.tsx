/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';

import { i18n } from '@kbn/i18n';
import rison from 'rison-node';
import { Feature } from 'geojson';
import { SearchResponse } from 'elasticsearch';
import {
  convertCompositeRespToGeoJson,
  convertRegularRespToGeoJson,
  makeESBbox,
} from '../../../../common/elasticsearch_util';
// @ts-expect-error
import { UpdateSourceEditor } from './update_source_editor';
import {
  DEFAULT_MAX_BUCKETS_LIMIT,
  ES_GEO_FIELD_TYPE,
  GEOCENTROID_AGG_NAME,
  GEOTILE_GRID_AGG_NAME,
  GIS_API_PATH,
  GRID_RESOLUTION,
  MVT_GETGRIDTILE_API_PATH,
  MVT_SOURCE_LAYER_NAME,
  RENDER_AS,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource } from '../es_agg_source';
import { DataRequestAbortError } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { LICENSED_FEATURES } from '../../../licensed_features';

import { getHttp } from '../../../kibana_services';
import { GeoJsonWithMeta, ITiledSingleLayerVectorSource } from '../vector_source';
import {
  ESGeoGridSourceDescriptor,
  MapExtent,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { ISearchSource } from '../../../../../../../src/plugins/data/common/search/search_source';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { isValidStringConfig } from '../../util/valid_string_config';

export const MAX_GEOTILE_LEVEL = 29;

export const clustersTitle = i18n.translate('xpack.maps.source.esGridClustersTitle', {
  defaultMessage: 'Clusters and grids',
});

export const heatmapTitle = i18n.translate('xpack.maps.source.esGridHeatmapTitle', {
  defaultMessage: 'Heat map',
});

export class ESGeoGridSource extends AbstractESAggSource implements ITiledSingleLayerVectorSource {
  static createDescriptor(
    descriptor: Partial<ESGeoGridSourceDescriptor>
  ): ESGeoGridSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(normalizedDescriptor.geoField)) {
      throw new Error('Cannot create an ESGeoGridSourceDescriptor without a geoField');
    }
    return {
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_GEO_GRID,
      geoField: normalizedDescriptor.geoField!,
      requestType: descriptor.requestType || RENDER_AS.POINT,
      resolution: descriptor.resolution ? descriptor.resolution : GRID_RESOLUTION.COARSE,
    };
  }

  readonly _descriptor: ESGeoGridSourceDescriptor;

  constructor(descriptor: Partial<ESGeoGridSourceDescriptor>, inspectorAdapters?: Adapters) {
    const sourceDescriptor = ESGeoGridSource.createDescriptor(descriptor);
    super(
      sourceDescriptor,
      inspectorAdapters,
      descriptor.resolution !== GRID_RESOLUTION.SUPER_FINE
    );
    this._descriptor = sourceDescriptor;
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> {
    return (
      <UpdateSourceEditor
        currentLayerType={sourceEditorArgs.currentLayerType}
        indexPatternId={this.getIndexPatternId()}
        onChange={sourceEditorArgs.onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
        resolution={this._descriptor.resolution}
      />
    );
  }

  getSyncMeta(): VectorSourceSyncMeta {
    return {
      requestType: this._descriptor.requestType,
    };
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    let indexPatternName = this.getIndexPatternId();
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternName = indexPattern.title;
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
        value: indexPatternName,
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

  isGeoGridPrecisionAware(): boolean {
    if (this._descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
      // MVT gridded data should not bootstrap each time the precision changes
      // mapbox-gl needs to handle this
      return false;
    } else {
      // Should requery each time grid-precision changes
      return true;
    }
  }

  showJoinEditor(): boolean {
    return false;
  }

  getGridResolution(): GRID_RESOLUTION {
    return this._descriptor.resolution;
  }

  getGeoGridPrecision(zoom: number): number {
    if (this._descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
      // The target-precision needs to be determined server side.
      return NaN;
    }

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
    searchSessionId,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bucketsPerGrid,
    isRequestStillActive,
    bufferedExtent,
  }: {
    searchSource: ISearchSource;
    searchSessionId?: string;
    indexPattern: IndexPattern;
    precision: number;
    layerName: string;
    registerCancelCallback: (callback: () => void) => void;
    bucketsPerGrid: number;
    isRequestStillActive: () => boolean;
    bufferedExtent: MapExtent;
  }) {
    const gridsPerRequest: number = Math.floor(DEFAULT_MAX_BUCKETS_LIMIT / bucketsPerGrid);
    const aggs: any = {
      compositeSplit: {
        composite: {
          size: gridsPerRequest,
          sources: [
            {
              [GEOTILE_GRID_AGG_NAME]: {
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
          [GEOCENTROID_AGG_NAME]: {
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
      const requestId: string = afterKey
        ? `${this.getId()} afterKey ${afterKey.geoSplit}`
        : this.getId();
      const esResponse: SearchResponse<unknown> = await this._runEsQuery({
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
        searchSessionId,
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

  _addNonCompositeAggsToSearchSource(
    searchSource: ISearchSource,
    indexPattern: IndexPattern,
    precision: number | null,
    bufferedExtent?: MapExtent | null
  ) {
    searchSource.setField('aggs', {
      [GEOTILE_GRID_AGG_NAME]: {
        geotile_grid: {
          bounds: bufferedExtent ? makeESBbox(bufferedExtent) : null,
          field: this._descriptor.geoField,
          precision,
          size: DEFAULT_MAX_BUCKETS_LIMIT,
          shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
        },
        aggs: {
          [GEOCENTROID_AGG_NAME]: {
            geo_centroid: {
              field: this._descriptor.geoField,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    });
  }

  // Do not use composite aggregation when there are no terms sub-aggregations
  // see https://github.com/elastic/kibana/pull/57875#issuecomment-590515482 for explanation on using separate code paths
  async _nonCompositeAggRequest({
    searchSource,
    searchSessionId,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bufferedExtent,
  }: {
    searchSource: ISearchSource;
    searchSessionId?: string;
    indexPattern: IndexPattern;
    precision: number;
    layerName: string;
    registerCancelCallback: (callback: () => void) => void;
    bufferedExtent?: MapExtent;
  }): Promise<Feature[]> {
    this._addNonCompositeAggsToSearchSource(searchSource, indexPattern, precision, bufferedExtent);

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGrid.inspectorDescription', {
        defaultMessage: 'Elasticsearch geo grid aggregation request',
      }),
      searchSessionId,
    });

    return convertRegularRespToGeoJson(esResponse, this._descriptor.requestType);
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    const indexPattern: IndexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(searchFilters, 0);

    let bucketsPerGrid = 1;
    this.getMetricFields().forEach((metricField) => {
      bucketsPerGrid += metricField.getBucketCount();
    });

    let features: Feature[];
    if (searchFilters.buffer) {
      features =
        bucketsPerGrid === 1
          ? await this._nonCompositeAggRequest({
              searchSource,
              searchSessionId: searchFilters.searchSessionId,
              indexPattern,
              precision: searchFilters.geogridPrecision || 0,
              layerName,
              registerCancelCallback,
              bufferedExtent: searchFilters.buffer,
            })
          : await this._compositeAggRequest({
              searchSource,
              searchSessionId: searchFilters.searchSessionId,
              indexPattern,
              precision: searchFilters.geogridPrecision || 0,
              layerName,
              registerCancelCallback,
              bucketsPerGrid,
              isRequestStillActive,
              bufferedExtent: searchFilters.buffer,
            });
    } else {
      throw new Error('Cannot get GeoJson without searchFilter.buffer');
    }

    return {
      data: {
        type: 'FeatureCollection',
        features,
      },
      meta: {
        areResultsTrimmed: false,
      },
    } as GeoJsonWithMeta;
  }

  getLayerName(): string {
    return MVT_SOURCE_LAYER_NAME;
  }

  async getUrlTemplateWithMeta(
    searchFilters: VectorSourceRequestMeta
  ): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }> {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);

    this._addNonCompositeAggsToSearchSource(
      searchSource,
      indexPattern,
      null, // needs to be set server-side
      null // needs to be stripped server-side
    );

    const dsl = await searchSource.getSearchRequestBody();

    const risonDsl = rison.encode(dsl);

    const mvtUrlServicePath = getHttp().basePath.prepend(
      `/${GIS_API_PATH}/${MVT_GETGRIDTILE_API_PATH}`
    );

    const geoField = await this._getGeoField();
    const urlTemplate = `${mvtUrlServicePath}?x={x}&y={y}&z={z}&geometryFieldName=${this._descriptor.geoField}&index=${indexPattern.title}&requestBody=${risonDsl}&requestType=${this._descriptor.requestType}&geoFieldType=${geoField.type}`;
    return {
      layerName: this.getLayerName(),
      minSourceZoom: this.getMinZoom(),
      maxSourceZoom: this.getMaxZoom(),
      urlTemplate,
    };
  }

  isFilterByMapBounds(): boolean {
    if (this._descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
      // MVT gridded data. Should exclude bounds-filter from ES-DSL
      return false;
    } else {
      // Should include bounds-filter from ES-DSL
      return true;
    }
  }

  canFormatFeatureProperties(): boolean {
    return true;
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    if (this._descriptor.requestType === RENDER_AS.GRID) {
      return [VECTOR_SHAPE_TYPE.POLYGON];
    }

    return [VECTOR_SHAPE_TYPE.POINT];
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    const geoField = await this._getGeoField();
    return geoField.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
      ? [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE]
      : [];
  }
}

registerSource({
  ConstructorFunction: ESGeoGridSource,
  type: SOURCE_TYPES.ES_GEO_GRID,
});
