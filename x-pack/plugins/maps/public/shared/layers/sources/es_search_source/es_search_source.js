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
import { ES_SEARCH } from '../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';
import { ESTooltipProperty } from '../../tooltips/es_tooltip_property';
import { getTermsFields } from '../../../utils/get_terms_fields';

import { DEFAULT_ES_DOC_LIMIT, DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';

export class ESSearchSource extends AbstractESSource {

  static type = ES_SEARCH;
  static title = i18n.translate('xpack.maps.source.esSearchTitle', {
    defaultMessage: 'Documents'
  });
  static description = i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Geospatial data from a Kibana index pattern'
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSelect = (sourceConfig) => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESSearchSource({
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
      type: ESSearchSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      limit: _.get(descriptor, 'limit', DEFAULT_ES_DOC_LIMIT),
      filterByMapBounds: _.get(descriptor, 'filterByMapBounds', DEFAULT_FILTER_BY_MAP_BOUNDS),
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
    }, inspectorAdapters);
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
      {
        label: getDataSourceLabel(),
        value: ESSearchSource.title
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
          defaultMessage: `Index pattern`,
        }),
        value: indexPatternTitle
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldTypeLabel', {
          defaultMessage: 'Geospatial field type',
        }),
        value: geoFieldType
      },
    ];
  }

  async getGeoJsonWithMeta(layerName, searchFilters) {
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

  async filterAndFormatPropertiesToHtml(properties) {
    const tooltipProps = [];
    let indexPattern;
    try {
      indexPattern = await this._getIndexPattern();
    } catch(error) {
      console.warn(`Unable to find Index pattern ${this._descriptor.indexPatternId}, values are not formatted`);
      return [];
    }

    this._descriptor.tooltipProperties.forEach(propertyName => {
      tooltipProps.push(new ESTooltipProperty(propertyName, properties[propertyName], indexPattern));
    });
    return tooltipProps;
  }

  isFilterByMapBounds() {
    return _.get(this._descriptor, 'filterByMapBounds', false);
  }

  async getLeftJoinFields() {
    const indexPattern = await this._getIndexPattern();
    return getTermsFields(indexPattern.fields)
      .map(field => {
        return { name: field.name, label: field.name };
      });
  }
}
