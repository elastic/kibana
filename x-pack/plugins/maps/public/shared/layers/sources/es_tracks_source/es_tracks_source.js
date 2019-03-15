/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import uuid from 'uuid/v4';

import { AbstractESSource } from '../es_source';
import { CreateSourceEditor } from './create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';
import { convertToGeoJson } from './convert_to_geojson';
import {
  indexPatternLabel,
  geoFieldLabel,
  timeFieldLabel,
  splitFieldLabel,
} from './constants';

export class ESTracksSource extends AbstractESSource {

  static type = 'ES_TRACKS';
  static title = i18n.translate('xpack.maps.source.esTracksTitle', {
    defaultMessage: 'Tracks'
  });
  static description = i18n.translate('xpack.maps.source.esTracksDescription', {
    defaultMessage: 'Group points from documents into tracks'
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSelect = (sourceConfig) => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESTracksSource({
        id: uuid(),
        ...sourceConfig
      }, inspectorAdapters);
      onPreviewSource(source);
    };
    return (<CreateSourceEditor onSelect={onSelect}/>);
  }

  constructor(descriptor, inspectorAdapters) {
    super({
      id: descriptor.id,
      type: ESTracksSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      timeField: descriptor.timeField,
      splitField: descriptor.splitField,
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
    }, inspectorAdapters);
  }

  async getNumberFields() {
    try {
      const indexPattern = await this._getIndexPattern();
      return indexPattern.fields.byType.number.map(field => {
        return { name: field.name, label: field.name };
      });
    } catch (error) {
      return [];
    }
  }

  getMetricFields() {
    return [];
  }

  getFieldNames() {
    return [
      this._descriptor.geoField,
      ...this._descriptor.tooltipProperties
    ];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    try {
      const indexPattern = await this._getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: ESTracksSource.title
      },
      {
        label: indexPatternLabel,
        value: indexPatternTitle
      },
      {
        label: geoFieldLabel,
        value: this._descriptor.geoField
      },
      {
        label: timeFieldLabel,
        value: this._descriptor.timeField
      },
      {
        label: splitFieldLabel,
        value: this._descriptor.splitField
      },
    ];
  }

  async getGeoJsonWithMeta(layerName, searchFilters) {
    const searchSource = await this._makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', this._makeAggs());
    const resp = await this._runEsQuery(layerName, searchSource, 'Elasticsearch document request');

    const indexPattern = await this._getIndexPattern();

    const { featureCollection, areResultsTrimmed } = convertToGeoJson({
      resp,
      geoField: this._descriptor.geoField,
      timeField: this._descriptor.timeField,
      splitField: this._descriptor.splitField,
      flattenHit: indexPattern.flattenHit
    });

    console.log(featureCollection);

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed
      }
    };
  }

  _makeAggs() {
    return {
      tracks: {
        terms: {
          field: this._descriptor.splitField,
          size: 30
        },
        aggs: {
          points: {
            top_hits: {
              sort: [
                {
                  [this._descriptor.timeField]: {
                    order: 'desc'
                  }
                }
              ],
              _source: {
                includes: [ this._descriptor.geoField, this._descriptor.timeField ]
              },
              size: 100
            }
          }
        }
      }
    };
  }

  canFormatFeatureProperties() {
    return true;
  }

  isFilterByMapBounds() {
    return true;
  }

  isJoinable() {
    return false;
  }

  async getStringFields() {
    const indexPattern = await this._getIndexPattern();
    const stringFields = indexPattern.fields.filter(field => {
      return field.type === 'string';
    });
    return stringFields.map(stringField => {
      return { name: stringField.name, label: stringField.name };
    });
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return properties;
  }
}
