/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import uuid from 'uuid/v4';

import { VectorSource } from '../vector_source';
import {
  fetchSearchSourceAndRecordWithInspector,
  inspectorAdapters,
  indexPatternService,
  SearchSource,
} from '../../../../kibana_services';
import { hitsToGeoJson, createExtentFilter } from '../../../../elasticsearch_geo_utils';
import { timefilter } from 'ui/timefilter/timefilter';
import { ESSourceDetails } from '../../../components/es_source_details';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import {
  EuiText,
  EuiSpacer
} from '@elastic/eui';

const DEFAULT_LIMIT = 2048;

export class ESSearchSource extends VectorSource {

  static type = 'ES_SEARCH';
  static typeDisplayName = 'Elasticsearch documents';

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

  static renderDropdownDisplayOption() {
    return (
      <Fragment>
        <strong>{ESSearchSource.typeDisplayName}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Geospatial data from an Elasticsearch index
          </p>
        </EuiText>
      </Fragment>);
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

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
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
    const indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    return indexPattern.fields.byType.number.map(field => {
      return { name: field.name, label: field.name };
    });
  }

  isFieldAware() {
    return true;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getFieldNames() {
    return [
      this._descriptor.geoField,
      ...this._descriptor.tooltipProperties
    ];
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  renderDetails() {
    return (
      <ESSourceDetails
        source={this}
        geoField={this._descriptor.geoField}
        geoFieldType="Shape field"
        sourceType={ESSearchSource.typeDisplayName}
      />
    );
  }

  async _getIndexPattern() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }
    return indexPattern;
  }

  async getGeoJsonWithMeta({ layerName }, searchFilters) {
    const indexPattern = await this._getIndexPattern();

    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(`Index pattern ${indexPattern.title} no longer contains the geo field ${this._descriptor.geoField}`);
    }

    let resp;
    try {
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', this._descriptor.limit);
      // Setting "fields" instead of "source: { includes: []}"
      // because SearchSource automatically adds the following by default
      // 1) all scripted fields
      // 2) docvalue_fields value is added for each date field in an index - see getComputedFields
      // By setting "fields", SearchSource removes all of defaults
      searchSource.setField('fields', searchFilters.fieldNames);
      const isTimeAware = await this.isTimeAware();
      searchSource.setField('filter', () => {
        const filters = [];
        //todo: this seems somewhat redundant. Have this be passed in as arguments in the getGeoJson.
        //no need to submit time and extent filters in the method if they are not supposed to be applied anyway
        if (this.isFilterByMapBounds()) {
          filters.push(createExtentFilter(searchFilters.buffer, geoField.name, geoField.type));
        }

        if (isTimeAware) {
          filters.push(timefilter.createFilter(indexPattern, searchFilters.timeFilters));
        }
        return filters;
      });
      searchSource.setField('query', searchFilters.query);

      resp = await fetchSearchSourceAndRecordWithInspector({
        searchSource,
        requestName: layerName,
        requestId: this._descriptor.id,
        requestDesc: 'Elasticsearch document request'
      });
    } catch(error) {
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }

    let featureCollection;
    const flattenHit = hit => {
      const properties = indexPattern.flattenHit(hit);
      // remove metaFields
      indexPattern.metaFields.forEach(metaField => {
        delete properties[metaField];
      });
      return properties;
    };
    try {
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

  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
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

  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
  }

}
