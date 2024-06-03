/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';

import { GeoJsonProperties } from 'geojson';
import { i18n } from '@kbn/i18n';
import { type Filter, buildPhraseFilter } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import {
  EMPTY_FEATURE_COLLECTION,
  FIELD_ORIGIN,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getField, addFieldToDSL } from '../../../../common/elasticsearch_util';
import {
  DataFilters,
  ESGeoLineSourceDescriptor,
  ESGeoLineSourceResponseMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { getDataSourceLabel, getDataViewLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource, ESAggsSourceSyncMeta } from '../es_agg_source';
import { DataRequest } from '../../util/data_request';
import { convertToGeoJson } from './convert_to_geojson';
import { ESDocField } from '../../fields/es_doc_field';
import { InlineField } from '../../fields/inline_field';
import { UpdateSourceEditor } from './update_source_editor';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { GeoJsonWithMeta, getLayerFeaturesRequestName } from '../vector_source';
import { isValidStringConfig } from '../../util/valid_string_config';
import { IField } from '../../fields/field';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { getIsGoldPlus } from '../../../licensed_features';
import { LICENSED_FEATURES } from '../../../licensed_features';
import { mergeExecutionContext } from '../execution_context_utils';
import { ENTITY_INPUT_LABEL, SORT_INPUT_LABEL } from './geo_line_form';
import {
  DEFAULT_LINE_SIMPLIFICATION_SIZE,
  MAX_TERMS_TRACKS,
  TIME_SERIES_ID_FIELD_NAME,
} from './constants';

type ESGeoLineSourceSyncMeta = ESAggsSourceSyncMeta &
  Pick<
    ESGeoLineSourceDescriptor,
    'groupByTimeseries' | 'lineSimplificationSize' | 'splitField' | 'sortField'
  >;

export const geoLineTitle = i18n.translate('xpack.maps.source.esGeoLineTitle', {
  defaultMessage: 'Tracks',
});

export const REQUIRES_GOLD_LICENSE_MSG = i18n.translate(
  'xpack.maps.source.esGeoLineDisabledReason',
  {
    defaultMessage: '{title} requires a Gold license.',
    values: { title: geoLineTitle },
  }
);

export class ESGeoLineSource extends AbstractESAggSource {
  static createDescriptor(
    descriptor: Partial<ESGeoLineSourceDescriptor>
  ): ESGeoLineSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(
      descriptor
    ) as ESGeoLineSourceDescriptor;

    if (!isValidStringConfig(normalizedDescriptor.geoField)) {
      throw new Error('Cannot create an ESGeoLineSource without a geoField');
    }

    const groupByTimeseries =
      typeof normalizedDescriptor.groupByTimeseries === 'boolean'
        ? normalizedDescriptor.groupByTimeseries
        : false;

    return {
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_GEO_LINE,
      groupByTimeseries,
      lineSimplificationSize:
        typeof normalizedDescriptor.lineSimplificationSize === 'number'
          ? normalizedDescriptor.lineSimplificationSize
          : DEFAULT_LINE_SIMPLIFICATION_SIZE,
      geoField: normalizedDescriptor.geoField!,
      splitField: normalizedDescriptor.splitField,
      sortField: normalizedDescriptor.sortField,
    };
  }

  readonly _descriptor: ESGeoLineSourceDescriptor;

  constructor(descriptor: Partial<ESGeoLineSourceDescriptor>) {
    const sourceDescriptor = ESGeoLineSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  getBucketsName() {
    return i18n.translate('xpack.maps.source.esGeoLine.bucketsName', {
      defaultMessage: 'tracks',
    });
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return (
      <UpdateSourceEditor
        bucketsName={this.getBucketsName()}
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        groupByTimeseries={this._descriptor.groupByTimeseries}
        lineSimplificationSize={this._descriptor.lineSimplificationSize}
        splitField={this._descriptor.splitField ?? ''}
        sortField={this._descriptor.sortField ?? ''}
      />
    );
  }

  getSyncMeta(dataFilters: DataFilters): ESGeoLineSourceSyncMeta {
    return {
      ...super.getSyncMeta(dataFilters),
      groupByTimeseries: this._descriptor.groupByTimeseries,
      lineSimplificationSize: this._descriptor.lineSimplificationSize,
      splitField: this._descriptor.splitField,
      sortField: this._descriptor.sortField,
    };
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      {
        label: getDataSourceLabel(),
        value: geoLineTitle,
      },
      {
        label: getDataViewLabel(),
        value: await this.getDisplayName(),
      },
      {
        label: i18n.translate('xpack.maps.source.esGeoLine.geospatialFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
    ];
  }

  _createSplitField(): IField | null {
    return this._descriptor.splitField
      ? new ESDocField({
          fieldName: this._descriptor.splitField,
          source: this,
          origin: FIELD_ORIGIN.SOURCE,
        })
      : null;
  }

  _createTsidField(): IField | null {
    return new InlineField<ESGeoLineSource>({
      fieldName: TIME_SERIES_ID_FIELD_NAME,
      label: TIME_SERIES_ID_FIELD_NAME,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: 'string',
    });
  }

  async getFields(): Promise<IField[]> {
    const groupByField = this._descriptor.groupByTimeseries
      ? this._createTsidField()
      : this._createSplitField();
    return groupByField ? [...this.getMetricFields(), groupByField] : this.getMetricFields();
  }

  getFieldByName(name: string): IField | null {
    if (name === this._descriptor.splitField) {
      return this._createSplitField();
    }

    if (name === TIME_SERIES_ID_FIELD_NAME) {
      return this._createTsidField();
    }

    return this.getMetricFieldForName(name);
  }

  isGeoGridPrecisionAware() {
    return false;
  }

  supportsJoins() {
    return false;
  }

  async getGeoJsonWithMeta(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    if (!getIsGoldPlus()) {
      throw new Error(REQUIRES_GOLD_LICENSE_MSG);
    }

    return this._descriptor.groupByTimeseries
      ? this._getGeoLineByTimeseries(
          layerName,
          requestMeta,
          registerCancelCallback,
          isRequestStillActive,
          inspectorAdapters
        )
      : this._getGeoLineByTerms(
          layerName,
          requestMeta,
          registerCancelCallback,
          isRequestStillActive,
          inspectorAdapters
        );
  }

  getInspectorRequestIds(): string[] {
    return [this._getTracksRequestId(), this._getEntitiesRequestId()];
  }

  private _getTracksRequestId() {
    return `${this.getId()}_tracks`;
  }

  private _getEntitiesRequestId() {
    return `${this.getId()}_entities`;
  }

  async _getGeoLineByTimeseries(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      totalEntities: {
        cardinality: {
          field: '_tsid',
        },
      },
      tracks: {
        time_series: {},
        aggs: {
          path: {
            geo_line: {
              point: {
                field: this._descriptor.geoField,
              },
              size: this._descriptor.lineSimplificationSize,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    });

    const warnings: SearchResponseWarning[] = [];
    const resp = await this._runEsQuery({
      requestId: this._getTracksRequestId(),
      requestName: getLayerFeaturesRequestName(layerName),
      searchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_geo_line:time_series_tracks' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });

    const { featureCollection } = convertToGeoJson(resp, TIME_SERIES_ID_FIELD_NAME);

    const entityCount = featureCollection.features.length;
    const areEntitiesTrimmed = entityCount >= 10000; // 10000 is max buckets created by time_series aggregation

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: areEntitiesTrimmed,
        areEntitiesTrimmed,
        entityCount,
        numTrimmedTracks: 0, // geo_line by time series never truncates tracks and instead simplifies tracks
        totalEntities: resp?.aggregations?.totalEntities?.value ?? 0,
        warnings,
      },
    };
  }

  async _getGeoLineByTerms(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    if (!this._descriptor.splitField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esGeoLine.missingConfigurationError', {
          defaultMessage: `Unable to create tracks. Provide a value for required configuration ''{inputLabel}''`,
          values: { inputLabel: ENTITY_INPUT_LABEL },
        })
      );
    }

    if (!this._descriptor.sortField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esGeoLine.missingConfigurationError', {
          defaultMessage: `Unable to create tracks. Provide a value for required configuration ''{inputLabel}''`,
          values: { inputLabel: SORT_INPUT_LABEL },
        })
      );
    }

    const indexPattern = await this.getIndexPattern();
    const warnings: SearchResponseWarning[] = [];

    // Request is broken into 2 requests
    // 1) fetch entities: filtered by buffer so that top entities in view are returned
    // 2) fetch tracks: not filtered by buffer to avoid having invalid tracks
    //    when the track extends beyond the area of the map buffer.

    //
    // Fetch entities
    //
    const entitySearchSource = await this.makeSearchSource(requestMeta, 0);
    entitySearchSource.setField('trackTotalHits', false);
    const splitField = getField(indexPattern, this._descriptor.splitField);
    const cardinalityAgg = { precision_threshold: MAX_TERMS_TRACKS };
    const termsAgg = { size: MAX_TERMS_TRACKS };
    entitySearchSource.setField('aggs', {
      totalEntities: {
        cardinality: addFieldToDSL(cardinalityAgg, splitField),
      },
      entitySplit: {
        terms: addFieldToDSL(termsAgg, splitField),
      },
    });
    if (splitField.type === 'string') {
      const entityIsNotEmptyFilter = buildPhraseFilter(splitField, '', indexPattern);
      entityIsNotEmptyFilter.meta.negate = true;
      entitySearchSource.setField('filter', [
        ...(entitySearchSource.getField('filter') as Filter[]),
        entityIsNotEmptyFilter,
      ]);
    }

    const entityResp = await this._runEsQuery({
      requestId: this._getEntitiesRequestId(),
      requestName: i18n.translate('xpack.maps.source.esGeoLine.entityRequestName', {
        defaultMessage: `load track entities ({layerName})`,
        values: {
          layerName,
        },
      }),
      searchSource: entitySearchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_geo_line:entities' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });
    const entityBuckets: Array<{ key: string; doc_count: number }> = _.get(
      entityResp,
      'aggregations.entitySplit.buckets',
      []
    );
    const totalEntities = _.get(entityResp, 'aggregations.totalEntities.value', 0);
    const areEntitiesTrimmed = entityBuckets.length >= MAX_TERMS_TRACKS;
    if (totalEntities === 0) {
      return {
        data: EMPTY_FEATURE_COLLECTION,
        meta: {
          areResultsTrimmed: false,
          areEntitiesTrimmed: false,
          entityCount: 0,
          numTrimmedTracks: 0,
          totalEntities: 0,
        } as ESGeoLineSourceResponseMeta,
      };
    }

    //
    // Fetch tracks
    //
    const entityFilters: { [key: string]: unknown } = {};
    for (let i = 0; i < entityBuckets.length; i++) {
      entityFilters[entityBuckets[i].key] = buildPhraseFilter(
        splitField,
        entityBuckets[i].key,
        indexPattern
      ).query;
    }
    const tracksSearchFilters = { ...requestMeta };
    delete tracksSearchFilters.buffer;
    const tracksSearchSource = await this.makeSearchSource(tracksSearchFilters, 0);
    tracksSearchSource.setField('trackTotalHits', false);
    tracksSearchSource.setField('aggs', {
      tracks: {
        filters: {
          filters: entityFilters,
        },
        aggs: {
          path: {
            geo_line: {
              point: {
                field: this._descriptor.geoField,
              },
              sort: {
                field: this._descriptor.sortField,
              },
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    });
    const tracksResp = await this._runEsQuery({
      requestId: this._getTracksRequestId(),
      requestName: getLayerFeaturesRequestName(layerName),
      searchSource: tracksSearchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_geo_line:terms_tracks' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });
    const { featureCollection, numTrimmedTracks } = convertToGeoJson(
      tracksResp,
      this._descriptor.splitField
    );

    return {
      data: featureCollection,
      meta: {
        // meta.areResultsTrimmed is used by updateDueToExtent to skip re-fetching results
        // when extent changes contained by original extent are not needed
        // Only trigger re-fetch when the number of entities are trimmed
        // Do not trigger re-fetch when tracks are trimmed since the tracks themselves are not filtered by map view extent.
        areResultsTrimmed: areEntitiesTrimmed,
        areEntitiesTrimmed,
        entityCount: entityBuckets.length,
        numTrimmedTracks,
        totalEntities,
        warnings,
      },
    };
  }

  getSourceStatus(sourceDataRequest?: DataRequest) {
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    const meta = sourceDataRequest
      ? (sourceDataRequest.getMeta() as ESGeoLineSourceResponseMeta)
      : null;
    if (!featureCollection || !meta) {
      // no tooltip content needed when there is no feature collection or meta
      return {
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    const entitiesFoundMsg = meta.areEntitiesTrimmed
      ? i18n.translate('xpack.maps.esGeoLine.areEntitiesTrimmedMsg', {
          defaultMessage: `Results limited to first {entityCount} tracks of ~{totalEntities}.`,
          values: {
            entityCount: meta.entityCount.toLocaleString(),
            totalEntities: meta.totalEntities.toLocaleString(),
          },
        })
      : i18n.translate('xpack.maps.esGeoLine.tracksCountMsg', {
          defaultMessage: `Found {entityCount} tracks.`,
          values: { entityCount: meta.entityCount.toLocaleString() },
        });
    const tracksTrimmedMsg =
      meta.numTrimmedTracks > 0
        ? i18n.translate('xpack.maps.esGeoLine.tracksTrimmedMsg', {
            defaultMessage: `{numTrimmedTracks} of {entityCount} tracks are incomplete.`,
            values: {
              entityCount: meta.entityCount.toLocaleString(),
              numTrimmedTracks: meta.numTrimmedTracks.toLocaleString(),
            },
          })
        : undefined;
    return {
      tooltipContent: tracksTrimmedMsg
        ? `${entitiesFoundMsg} ${tracksTrimmedMsg}`
        : entitiesFoundMsg,
      // Used to show trimmed icon in legend. Trimmed icon signals the following
      // 1) number of entities are trimmed.
      // 2) one or more tracks are incomplete.
      areResultsTrimmed: meta.areEntitiesTrimmed || meta.numTrimmedTracks > 0,
    };
  }

  isFilterByMapBounds() {
    return true;
  }

  hasTooltipProperties() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.LINE];
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const tooltipProperties = await super.getTooltipProperties(properties);
    if (properties && typeof properties!.complete === 'boolean') {
      tooltipProperties.push(
        new TooltipProperty(
          '__kbn__track__complete',
          this._descriptor.groupByTimeseries
            ? i18n.translate('xpack.maps.source.esGeoLine.isTrackSimplifiedLabel', {
                defaultMessage: 'track is simplified',
              })
            : i18n.translate('xpack.maps.source.esGeoLine.isTrackTruncatedLabel', {
                defaultMessage: 'track is truncated',
              }),
          (!properties.complete).toString()
        )
      );
    }
    return tooltipProperties;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [LICENSED_FEATURES.GEO_LINE_AGG];
  }
}
