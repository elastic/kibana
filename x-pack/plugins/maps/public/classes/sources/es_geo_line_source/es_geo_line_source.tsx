/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { GeoJsonProperties } from 'geojson';
import { i18n } from '@kbn/i18n';
import {
  EMPTY_FEATURE_COLLECTION,
  FIELD_ORIGIN,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getField, addFieldToDSL } from '../../../../common/elasticsearch_util';
import {
  ESGeoLineSourceDescriptor,
  ESGeoLineSourceResponseMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource } from '../es_agg_source';
import { DataRequest } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { convertToGeoJson } from './convert_to_geojson';
import { ESDocField } from '../../fields/es_doc_field';
import { UpdateSourceEditor } from './update_source_editor';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { GeoJsonWithMeta } from '../vector_source';
import { isValidStringConfig } from '../../util/valid_string_config';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { IField } from '../../fields/field';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { esFilters } from '../../../../../../../src/plugins/data/public';
import { getIsGoldPlus } from '../../../licensed_features';
import { LICENSED_FEATURES } from '../../../licensed_features';

const MAX_TRACKS = 250;

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
    if (!isValidStringConfig(normalizedDescriptor.splitField)) {
      throw new Error('Cannot create an ESGeoLineSource without a splitField');
    }
    if (!isValidStringConfig(normalizedDescriptor.sortField)) {
      throw new Error('Cannot create an ESGeoLineSource without a sortField');
    }
    return {
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_GEO_LINE,
      geoField: normalizedDescriptor.geoField!,
      splitField: normalizedDescriptor.splitField!,
      sortField: normalizedDescriptor.sortField!,
    };
  }

  readonly _descriptor: ESGeoLineSourceDescriptor;

  constructor(descriptor: Partial<ESGeoLineSourceDescriptor>, inspectorAdapters?: Adapters) {
    const sourceDescriptor = ESGeoLineSource.createDescriptor(descriptor);
    super(sourceDescriptor, inspectorAdapters, true);
    this._descriptor = sourceDescriptor;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return (
      <UpdateSourceEditor
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        splitField={this._descriptor.splitField}
        sortField={this._descriptor.sortField}
      />
    );
  }

  getSyncMeta() {
    return {
      splitField: this._descriptor.splitField,
      sortField: this._descriptor.sortField,
    };
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
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
        value: geoLineTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGeoLine.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGeoLine.geospatialFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
    ];
  }

  _createSplitField(): IField {
    return new ESDocField({
      fieldName: this._descriptor.splitField,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      canReadFromGeoJson: true,
    });
  }

  getFieldNames() {
    return [
      ...this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName()),
      this._descriptor.splitField,
      this._descriptor.sortField,
    ];
  }

  async getFields(): Promise<IField[]> {
    return [...this.getMetricFields(), this._createSplitField()];
  }

  getFieldByName(name: string): IField | null {
    return name === this._descriptor.splitField
      ? this._createSplitField()
      : this.getMetricFieldForName(name);
  }

  isGeoGridPrecisionAware() {
    return false;
  }

  showJoinEditor() {
    return false;
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    if (!getIsGoldPlus()) {
      throw new Error(REQUIRES_GOLD_LICENSE_MSG);
    }

    const indexPattern = await this.getIndexPattern();

    // Request is broken into 2 requests
    // 1) fetch entities: filtered by buffer so that top entities in view are returned
    // 2) fetch tracks: not filtered by buffer to avoid having invalid tracks
    //    when the track extends beyond the area of the map buffer.

    //
    // Fetch entities
    //
    const entitySearchSource = await this.makeSearchSource(searchFilters, 0);
    const splitField = getField(indexPattern, this._descriptor.splitField);
    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = { size: MAX_TRACKS };
    entitySearchSource.setField('aggs', {
      totalEntities: {
        cardinality: addFieldToDSL(cardinalityAgg, splitField),
      },
      entitySplit: {
        terms: addFieldToDSL(termsAgg, splitField),
      },
    });
    const entityResp = await this._runEsQuery({
      requestId: `${this.getId()}_entities`,
      requestName: i18n.translate('xpack.maps.source.esGeoLine.entityRequestName', {
        defaultMessage: '{layerName} entities',
        values: {
          layerName,
        },
      }),
      searchSource: entitySearchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGeoLine.entityRequestDescription', {
        defaultMessage: 'Elasticsearch terms request to fetch entities within map buffer.',
      }),
      searchSessionId: searchFilters.searchSessionId,
    });
    const entityBuckets: Array<{ key: string; doc_count: number }> = _.get(
      entityResp,
      'aggregations.entitySplit.buckets',
      []
    );
    const totalEntities = _.get(entityResp, 'aggregations.totalEntities.value', 0);
    const areEntitiesTrimmed = entityBuckets.length >= MAX_TRACKS;
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
      entityFilters[entityBuckets[i].key] = esFilters.buildPhraseFilter(
        splitField,
        entityBuckets[i].key,
        indexPattern
      ).query;
    }
    const tracksSearchFilters = { ...searchFilters };
    delete tracksSearchFilters.buffer;
    const tracksSearchSource = await this.makeSearchSource(tracksSearchFilters, 0);
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
      requestId: `${this.getId()}_tracks`,
      requestName: i18n.translate('xpack.maps.source.esGeoLine.trackRequestName', {
        defaultMessage: '{layerName} tracks',
        values: {
          layerName,
        },
      }),
      searchSource: tracksSearchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGeoLine.trackRequestDescription', {
        defaultMessage:
          'Elasticsearch geo_line request to fetch tracks for entities. Tracks are not filtered by map buffer.',
      }),
      searchSessionId: searchFilters.searchSessionId,
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
      } as ESGeoLineSourceResponseMeta,
    };
  }

  getSourceTooltipContent(sourceDataRequest?: DataRequest) {
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
            entityCount: meta.entityCount,
            totalEntities: meta.totalEntities,
          },
        })
      : i18n.translate('xpack.maps.esGeoLine.tracksCountMsg', {
          defaultMessage: `Found {entityCount} tracks.`,
          values: { entityCount: meta.entityCount },
        });
    const tracksTrimmedMsg =
      meta.numTrimmedTracks > 0
        ? i18n.translate('xpack.maps.esGeoLine.tracksTrimmedMsg', {
            defaultMessage: `{numTrimmedTracks} of {entityCount} tracks are incomplete.`,
            values: {
              entityCount: meta.entityCount,
              numTrimmedTracks: meta.numTrimmedTracks,
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

  canFormatFeatureProperties() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.LINE];
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const tooltipProperties = await super.getTooltipProperties(properties);
    tooltipProperties.push(
      new TooltipProperty(
        'isTrackComplete',
        i18n.translate('xpack.maps.source.esGeoLine.isTrackCompleteLabel', {
          defaultMessage: 'track is complete',
        }),
        properties!.complete.toString()
      )
    );
    return tooltipProperties;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [LICENSED_FEATURES.GEO_LINE_AGG];
  }
}

registerSource({
  ConstructorFunction: ESGeoLineSource,
  type: SOURCE_TYPES.ES_GEO_LINE,
});
