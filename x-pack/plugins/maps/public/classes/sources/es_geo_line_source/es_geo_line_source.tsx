/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { GeoJsonProperties } from 'geojson';
import { i18n } from '@kbn/i18n';
import { FIELD_ORIGIN, SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
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
import { getIsGoldPlus } from '../../../licensed_features';

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
    const { totalEntities, areEntitiesTrimmed, locationsResp } = await this._getEntityLocations({
      entityField: this._descriptor.splitField,
      numEntities: MAX_TRACKS,
      layerName,
      searchFilters,
      registerCancelCallback,
      locationAggs: {
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
    });
    const { featureCollection, numTrimmedTracks } = convertToGeoJson(
      locationsResp,
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
        entityCount: featureCollection.features.length,
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
}

registerSource({
  ConstructorFunction: ESGeoLineSource,
  type: SOURCE_TYPES.ES_GEO_LINE,
});
