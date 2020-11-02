/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { i18n } from '@kbn/i18n';
import { FIELD_ORIGIN, SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getField, addFieldToDSL, makeESBbox } from '../../../../common/elasticsearch_util';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource, DEFAULT_METRIC } from '../es_agg_source';
import { DataRequestAbortError } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { convertToGeoJson } from './convert_to_geojson';
import { ESDocField } from '../../fields/es_doc_field';
import { UpdateSourceEditor } from './update_source_editor';
import { SourceEditorArgs } from '../source';

const MAX_TRACKS = 1000;

export const geoLineTitle = i18n.translate('xpack.maps.source.esGeoLineTitle', {
  defaultMessage: 'Tracks',
});

export interface GeoLineSourceConfig {
  indexPatternId: string;
  geoField: string;
  splitField: string;
  sortField: string;
}

export class ESGeoLineSource extends AbstractESAggSource {
  static createDescriptor(sourceConfig: GeoLineSourceConfig) {
    return {
      type: SOURCE_TYPES.ES_GEO_LINE,
      id: uuid(),
      metrics: [DEFAULT_METRIC],
      ...sourceConfig,
    };
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

  _createSplitField() {
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

  async getFields() {
    return [...this.getMetricFields(), this._createSplitField()];
  }

  getFieldByName(name: string) {
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

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback, isRequestStillActive) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);

    const splitField = getField(indexPattern, this._descriptor.splitField);
    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = { size: MAX_TRACKS };
    searchSource.setField('aggs', {
      totalEntities: {
        cardinality: addFieldToDSL(cardinalityAgg, splitField),
      },
      entitySplit: {
        terms: addFieldToDSL(termsAgg, splitField),
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

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGeoLine.requestLabel', {
        defaultMessage: 'Elasticsearch tracks request',
      }),
    });

    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    const totalEntities = _.get(resp, 'aggregations.totalEntities.value', 0);
    const areEntitiesTrimmed = entityBuckets.length >= MAX_TRACKS;
    return {
      data: convertToGeoJson(resp, this._descriptor.splitField).featureCollection,
      meta: {
        areResultsTrimmed: areEntitiesTrimmed,
        areEntitiesTrimmed,
        entityCount: entityBuckets.length,
        totalEntities,
      },
    };
  }

  getSourceTooltipContent(sourceDataRequest) {
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!featureCollection || !meta) {
      // no tooltip content needed when there is no feature collection or meta
      return {
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    const entitiesFoundMsg = meta.areEntitiesTrimmed
      ? i18n.translate('xpack.maps.esGeoLine.tracksTrimmedMsg', {
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
    return {
      tooltipContent: entitiesFoundMsg,
      // Used to show trimmed icon in legend
      // user only needs to be notified of trimmed results when entities are trimmed
      areResultsTrimmed: meta.areEntitiesTrimmed,
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
}

registerSource({
  ConstructorFunction: ESGeoLineSource,
  type: SOURCE_TYPES.ES_GEO_LINE,
});
