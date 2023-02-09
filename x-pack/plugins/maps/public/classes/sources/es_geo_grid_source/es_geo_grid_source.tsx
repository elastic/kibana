/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';

import { i18n } from '@kbn/i18n';
import { Feature } from 'geojson';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ISearchSource } from '@kbn/data-plugin/common/search/search_source';
import { DataView } from '@kbn/data-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { makeESBbox } from '../../../../common/elasticsearch_util';
import { convertCompositeRespToGeoJson, convertRegularRespToGeoJson } from './convert_to_geojson';
import { UpdateSourceEditor } from './update_source_editor';
import {
  DEFAULT_MAX_BUCKETS_LIMIT,
  ES_GEO_FIELD_TYPE,
  GEOCENTROID_AGG_NAME,
  GEOTILE_GRID_AGG_NAME,
  GIS_API_PATH,
  GRID_RESOLUTION,
  MVT_GETGRIDTILE_API_PATH,
  RENDER_AS,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { encodeMvtResponseBody } from '../../../../common/mvt_request_body';
import { getDataSourceLabel, getDataViewLabel } from '../../../../common/i18n_getters';
import { buildGeoGridFilter } from '../../../../common/elasticsearch_util';
import { AbstractESAggSource } from '../es_agg_source';
import { DataRequestAbortError } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { LICENSED_FEATURES } from '../../../licensed_features';

import { getHttp } from '../../../kibana_services';
import { GetFeatureActionsArgs, GeoJsonWithMeta, IMvtVectorSource } from '../vector_source';
import {
  ESGeoGridSourceDescriptor,
  MapExtent,
  SizeDynamicOptions,
  TooltipFeatureAction,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { ImmutableSourceProperty, OnSourceChangeArgs, SourceEditorArgs } from '../source';
import { isValidStringConfig } from '../../util/valid_string_config';
import { makePublicExecutionContext } from '../../../util';
import { isMvt } from './is_mvt';
import { VectorStyle } from '../../styles/vector/vector_style';
import { getIconSize } from './get_icon_size';

type ESGeoGridSourceSyncMeta = Pick<ESGeoGridSourceDescriptor, 'requestType' | 'resolution'>;

const MAX_GEOTILE_LEVEL = 29;

export const clustersTitle = i18n.translate('xpack.maps.source.esGridClustersTitle', {
  defaultMessage: 'Clusters',
});

export const heatmapTitle = i18n.translate('xpack.maps.source.esGridHeatmapTitle', {
  defaultMessage: 'Heat map',
});

export class ESGeoGridSource extends AbstractESAggSource implements IMvtVectorSource {
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

  constructor(descriptor: Partial<ESGeoGridSourceDescriptor>) {
    const sourceDescriptor = ESGeoGridSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> {
    async function onChange(...sourceChanges: OnSourceChangeArgs[]) {
      sourceEditorArgs.onChange(...sourceChanges);
      const resolutionPropChange = sourceChanges.find((sourceChange) => {
        return sourceChange.propName === 'resolution';
      });
      if (resolutionPropChange && 'getPropertiesDescriptor' in sourceEditorArgs.style) {
        const propertiesDescriptor = (
          sourceEditorArgs.style as VectorStyle
        ).getPropertiesDescriptor();
        if (propertiesDescriptor[VECTOR_STYLES.ICON_SIZE].type === STYLE_TYPE.DYNAMIC) {
          propertiesDescriptor[VECTOR_STYLES.ICON_SIZE] = {
            ...propertiesDescriptor[VECTOR_STYLES.ICON_SIZE],
            options: {
              ...propertiesDescriptor[VECTOR_STYLES.ICON_SIZE].options,
              ...getIconSize(resolutionPropChange.value as GRID_RESOLUTION),
            },
          } as {
            type: STYLE_TYPE.DYNAMIC;
            options: SizeDynamicOptions;
          };
          const vectorStyleDescriptor = VectorStyle.createDescriptor(
            propertiesDescriptor,
            (sourceEditorArgs.style as VectorStyle).isTimeAware()
          );
          sourceEditorArgs.onStyleDescriptorChange(vectorStyleDescriptor);
        }
      }
    }
    return (
      <UpdateSourceEditor
        currentLayerType={sourceEditorArgs.currentLayerType}
        geoFieldName={this.getGeoFieldName()}
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
        resolution={this._descriptor.resolution}
      />
    );
  }

  getSyncMeta(): ESGeoGridSourceSyncMeta {
    return {
      requestType: this._descriptor.requestType,
      resolution: this._descriptor.resolution,
    };
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      {
        label: getDataSourceLabel(),
        value: this._descriptor.requestType === RENDER_AS.HEATMAP ? heatmapTitle : clustersTitle,
      },
      {
        label: getDataViewLabel(),
        value: await this.getDisplayName(),
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.geospatialFieldLabel', {
          defaultMessage: 'Cluster field',
        }),
        value: this._descriptor.geoField,
      },
    ];
  }

  isMvt(): boolean {
    return isMvt(this._descriptor.requestType, this._descriptor.resolution);
  }

  getFieldNames() {
    return this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName());
  }

  isGeoGridPrecisionAware(): boolean {
    if (this.isMvt()) {
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
    // Hexagon resolutions do not scale evenly to zoom levels.
    // zoomX and zoomX + 1 may result in the same hexagon resolution.
    // To avoid FINE and MOST_FINE providing potenitally the same resolution,
    // use 3 level resolution system that increases zoom + 3 per resolution step.
    if (this._descriptor.requestType === RENDER_AS.HEX) {
      if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
        return 2;
      }

      if (
        this._descriptor.resolution === GRID_RESOLUTION.FINE ||
        this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE
      ) {
        return 5;
      }

      if (this._descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
        return 8;
      }
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      return 2;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      return 3;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      return 4;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
      return 8;
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
    inspectorAdapters,
  }: {
    searchSource: ISearchSource;
    searchSessionId?: string;
    indexPattern: DataView;
    precision: number;
    layerName: string;
    registerCancelCallback: (callback: () => void) => void;
    bucketsPerGrid: number;
    isRequestStillActive: () => boolean;
    bufferedExtent: MapExtent;
    inspectorAdapters: Adapters;
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
      const esResponse: estypes.SearchResponse<unknown> = await this._runEsQuery({
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
        executionContext: makePublicExecutionContext('es_geo_grid_source:cluster_composite'),
        requestsAdapter: inspectorAdapters.requests,
      });

      features.push(...convertCompositeRespToGeoJson(esResponse, this._descriptor.requestType));

      const aggr = esResponse.aggregations
        ?.compositeSplit as estypes.AggregationsCompositeAggregate;
      afterKey = aggr.after_key;
      if (aggr.buckets.length < gridsPerRequest) {
        // Finished because request did not get full resultset back
        break;
      }
    }

    return features;
  }

  async _nonCompositeAggRequest({
    searchSource,
    searchSessionId,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bufferedExtent,
    tooManyBuckets,
    inspectorAdapters,
  }: {
    searchSource: ISearchSource;
    searchSessionId?: string;
    indexPattern: DataView;
    precision: number;
    layerName: string;
    registerCancelCallback: (callback: () => void) => void;
    bufferedExtent: MapExtent;
    tooManyBuckets: boolean;
    inspectorAdapters: Adapters;
  }): Promise<Feature[]> {
    const valueAggsDsl = tooManyBuckets
      ? this.getValueAggsDsl(indexPattern, (metric) => {
          // filter out sub-bucket generating metrics if there is the potential for tooManyBucket
          return metric.getBucketCount() === 0;
        })
      : this.getValueAggsDsl(indexPattern);
    searchSource.setField('aggs', {
      [GEOTILE_GRID_AGG_NAME]: {
        geotile_grid: {
          bounds: makeESBbox(bufferedExtent),
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
          ...valueAggsDsl,
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
      searchSessionId,
      executionContext: makePublicExecutionContext('es_geo_grid_source:cluster'),
      requestsAdapter: inspectorAdapters.requests,
    });

    return convertRegularRespToGeoJson(esResponse, this._descriptor.requestType);
  }

  async _isGeoShape() {
    try {
      const geoField = await this._getGeoField();
      return geoField.type === ES_GEO_FIELD_TYPE.GEO_SHAPE;
    } catch (error) {
      // ignore _getGeoField exeception, error will surface in legend from loading data.
      return false;
    }
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    if (!searchFilters.buffer) {
      throw new Error('Cannot get GeoJson without searchFilter.buffer');
    }

    const indexPattern: DataView = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('trackTotalHits', false);

    let bucketsPerGrid = 1;
    this.getMetricFields().forEach((metricField) => {
      bucketsPerGrid += metricField.getBucketCount();
    });

    // Sub-bucketing geotile_grid may result in bucket overflow for higher grid resolutions
    // In those cases, use composite aggregation
    // see https://github.com/elastic/kibana/pull/57875#issuecomment-590515482 for explanation on using separate code paths
    const tooManyBuckets =
      this._descriptor.resolution !== GRID_RESOLUTION.COARSE && bucketsPerGrid > 1;

    // geotile_grid with geo_shape does not support composite aggregation
    // https://github.com/elastic/elasticsearch/issues/60626
    const supportsCompositeAgg = !(await this._isGeoShape());

    const features: Feature[] =
      supportsCompositeAgg && tooManyBuckets
        ? await this._compositeAggRequest({
            searchSource,
            searchSessionId: searchFilters.searchSessionId,
            indexPattern,
            precision: searchFilters.geogridPrecision || 0,
            layerName,
            registerCancelCallback,
            bucketsPerGrid,
            isRequestStillActive,
            bufferedExtent: searchFilters.buffer,
            inspectorAdapters,
          })
        : await this._nonCompositeAggRequest({
            searchSource,
            searchSessionId: searchFilters.searchSessionId,
            indexPattern,
            precision: searchFilters.geogridPrecision || 0,
            layerName,
            registerCancelCallback,
            bufferedExtent: searchFilters.buffer,
            tooManyBuckets,
            inspectorAdapters,
          });

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

  getTileSourceLayer(): string {
    return 'aggs';
  }

  async getTileUrl(
    searchFilters: VectorSourceRequestMeta,
    refreshToken: string,
    hasLabels: boolean,
    buffer: number
  ): Promise<string> {
    const dataView = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', this.getValueAggsDsl(dataView));

    const mvtUrlServicePath = getHttp().basePath.prepend(
      `/${GIS_API_PATH}/${MVT_GETGRIDTILE_API_PATH}/{z}/{x}/{y}.pbf`
    );

    return `${mvtUrlServicePath}\
?geometryFieldName=${this._descriptor.geoField}\
&index=${dataView.getIndexPattern()}\
&gridPrecision=${this._getGeoGridPrecisionResolutionDelta()}\
&hasLabels=${hasLabels}\
&buffer=${buffer}\
&requestBody=${encodeMvtResponseBody(searchSource.getSearchRequestBody())}\
&renderAs=${this._descriptor.requestType}\
&token=${refreshToken}`;
  }

  isFilterByMapBounds(): boolean {
    if (this.isMvt()) {
      // MVT gridded data. Should exclude bounds-filter from ES-DSL
      return false;
    } else {
      // Should include bounds-filter from ES-DSL
      return true;
    }
  }

  hasTooltipProperties(): boolean {
    return true;
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    if (
      this._descriptor.requestType === RENDER_AS.GRID ||
      this._descriptor.requestType === RENDER_AS.HEX
    ) {
      return [VECTOR_SHAPE_TYPE.POLYGON];
    }

    return [VECTOR_SHAPE_TYPE.POINT];
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return (await this._isGeoShape()) ? [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE] : [];
  }

  getFeatureActions({
    addFilters,
    featureId,
    geoFieldNames,
    onClose,
  }: GetFeatureActionsArgs): TooltipFeatureAction[] {
    if (geoFieldNames.length === 0 || addFilters === null) {
      return [];
    }

    return [
      {
        label: i18n.translate('xpack.maps.tooltip.action.filterByClusterLabel', {
          defaultMessage: 'Filter by cluster',
        }),
        id: 'FILTER_BY_CLUSTER_ACTION',
        onClick: () => {
          const geoGridFilter = buildGeoGridFilter({
            geoFieldNames,
            gridId: featureId, // featureId is grid id for ES_GEO_GRID source
            isHex: this._descriptor.requestType === RENDER_AS.HEX,
          });
          addFilters([geoGridFilter], ACTION_GLOBAL_APPLY_FILTER);
          onClose();
        },
      },
    ];
  }
}

registerSource({
  ConstructorFunction: ESGeoGridSource,
  type: SOURCE_TYPES.ES_GEO_GRID,
});
