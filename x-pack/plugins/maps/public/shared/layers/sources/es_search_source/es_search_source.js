/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import uuid from 'uuid/v4';

import { AbstractESSource } from '../es_source';
import { hitsToGeoJson } from '../../../../elasticsearch_geo_utils';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';

const DEFAULT_LIMIT = 2048;

export class ESSearchSource extends AbstractESSource {

  static type = 'ES_SEARCH';
  static title = 'Elasticsearch documents';
  static description = 'Geospatial data from a Kibana index pattern';

  static renderEditor({ onPreviewSource }) {
    const onSelect = (layerConfig) => {
      const layerSource = new ESSearchSource({
        id: uuid(),
        ...layerConfig
      });
      onPreviewSource(layerSource);
    };
    return (<CreateSourceEditor onSelect={onSelect}/>);
  }

  constructor(descriptor) {
    super({
      id: descriptor.id,
      type: ESSearchSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      limit: _.get(descriptor, 'limit', DEFAULT_LIMIT),
      filterByMapBounds: _.get(descriptor, 'filterByMapBounds', true),
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
    });
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        filterByMapBounds={this._descriptor.filterByMapBounds}
        tooltipProperties={this._descriptor.tooltipProperties}
      />
    );
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

  getFieldNames() {
    return [
      this._descriptor.geoField,
      ...this._descriptor.tooltipProperties
    ];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    let geoFieldType = '';
    try {
      const indexPattern = await this._getIndexPattern();
      indexPatternTitle = indexPattern.title;
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      { label: 'Data source', value: ESSearchSource.title },
      { label: 'Index pattern', value: indexPatternTitle },
      { label: 'Geospatial field', value: this._descriptor.geoField },
      { label: 'Geospatial field type', value: geoFieldType },
    ];
  }

  async getGeoJsonWithMeta({ layerName }, searchFilters) {
    const searchSource = await this._makeSearchSource(searchFilters, this._descriptor.limit);
    // Setting "fields" instead of "source: { includes: []}"
    // because SearchSource automatically adds the following by default
    // 1) all scripted fields
    // 2) docvalue_fields value is added for each date field in an index - see getComputedFields
    // By setting "fields", SearchSource removes all of defaults
    searchSource.setField('fields', searchFilters.fieldNames);

    let featureCollection;
    const indexPattern = await this._getIndexPattern();
    const flattenHit = hit => {
      const properties = indexPattern.flattenHit(hit);
      // remove metaFields
      indexPattern.metaFields.forEach(metaField => {
        delete properties[metaField];
      });
      return properties;
    };

    const resp = await this._runEsQuery(layerName, searchSource, 'Elasticsearch document request');
    try {
      const geoField = await this._getGeoField();
      featureCollection = hitsToGeoJson(resp.hits.hits, flattenHit, geoField.name, geoField.type);
    } catch(error) {
      throw new Error(`Unable to convert search response to geoJson feature collection, error: ${error.message}`);
    }

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: resp.hits.total > resp.hits.hits.length
      }
    };
  }

  canFormatFeatureProperties() {
    return this._descriptor.tooltipProperties.length > 0;
  }

  async filterAndFormatProperties(properties) {
    const filteredProperties = {};
    this._descriptor.tooltipProperties.forEach(propertyName => {
      filteredProperties[propertyName] = _.get(properties, propertyName, '-');
    });

    let indexPattern;
    try {
      indexPattern = await this._getIndexPattern();
    } catch(error) {
      console.warn(`Unable to find Index pattern ${this._descriptor.indexPatternId}, values are not formatted`);
      return filteredProperties;
    }

    this._descriptor.tooltipProperties.forEach(propertyName => {
      const field = indexPattern.fields.byName[propertyName];
      if (!field) {
        return;
      }

      filteredProperties[propertyName] = field.format.convert(filteredProperties[propertyName]);
    });

    return filteredProperties;
  }

  isFilterByMapBounds() {
    return _.get(this._descriptor, 'filterByMapBounds', false);
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
}
