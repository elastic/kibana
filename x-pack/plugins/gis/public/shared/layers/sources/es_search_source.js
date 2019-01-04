/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import uuid from 'uuid/v4';

import { VectorSource } from './vector_source';
import {
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';
import { SingleFieldSelect } from '../../components/single_field_select';
import { MultiFieldSelect } from './multi_field_select';
import {
  fetchSearchSourceAndRecordWithInspector,
  inspectorAdapters,
  indexPatternService,
  SearchSource,
} from '../../../kibana_services';
import { hitsToGeoJson, createExtentFilter } from '../../../elasticsearch_geo_utils';
import { timefilter } from 'ui/timefilter/timefilter';
import { ESSourceDetails } from '../../components/es_source_details';

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
    return (<Editor onSelect={onSelect}/>);
  }

  constructor(descriptor) {
    super({
      id: descriptor.id,
      type: ESSearchSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      limit: descriptor.limit,
      filterByMapBounds: descriptor.filterByMapBounds,
      showTooltip: _.get(descriptor, 'showTooltip', false),
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
    });
  }

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
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

  getFieldNames() {
    return [
      this._descriptor.geoField,
      ...this._descriptor.tooltipProperties
    ];
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
    return this._descriptor.showTooltip && this._descriptor.tooltipProperties.length > 0;
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

class Editor extends React.Component {

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
  }

  constructor() {
    super();
    this.state = {
      isLoadingIndexPattern: false,
      indexPatternId: '',
      geoField: '',
      selectedFields: [],
      limit: DEFAULT_LIMIT,
      filterByMapBounds: true,
      showTooltip: true,
      tooltipProperties: [],
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadIndexPattern(this.state.indexPatternId);
  }

  onIndexPatternSelect = (indexPatternId) => {
    this.setState({
      indexPatternId,
    }, this.loadIndexPattern(indexPatternId));
  };

  loadIndexPattern = (indexPatternId) => {
    this.setState({
      isLoadingIndexPattern: true,
      indexPattern: undefined,
      geoField: undefined,
      tooltipProperties: [],
    }, this.debouncedLoad.bind(null, indexPatternId));
  }

  debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== indexPatternId) {
      return;
    }

    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern
    });

    //make default selection
    const geoFields = indexPattern.fields.filter(Editor._filterGeoField);
    if (geoFields[0]) {
      this.onGeoFieldSelect(geoFields[0].name);
    }

  }, 300);

  onGeoFieldSelect = (geoField) => {
    this.setState({
      geoField
    }, this.previewLayer);
  };


  onLimitChange = e => {
    const sanitizedValue = parseInt(e.target.value, 10);
    this.setState({
      limit: isNaN(sanitizedValue) ? '' : sanitizedValue,
    }, this.previewLayer);
  }

  onFilterByMapBoundsChange = e => {
    this.setState({
      filterByMapBounds: e.target.checked,
    }, this.previewLayer);
  };

  onShowTooltipChange = e => {
    this.setState({
      showTooltip: e.target.checked,
    }, this.previewLayer);
  };

  onTooltipPropertiesSelect = (propertyNames) => {
    this.setState({
      tooltipProperties: propertyNames
    }, this.previewLayer);
  };

  previewLayer = () => {
    const {
      indexPatternId,
      geoField,
      limit,
      filterByMapBounds,
      showTooltip,
      tooltipProperties,
    } = this.state;
    if (indexPatternId && geoField) {
      this.props.onSelect({
        indexPatternId,
        geoField,
        limit: limit ? limit : DEFAULT_LIMIT,
        filterByMapBounds,
        showTooltip,
        tooltipProperties,
      });
    }
  }

  static _filterGeoField = (field) => {
    return ['geo_point', 'geo_shape'].includes(field.type);
  }

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <EuiFormRow
        label="Geospatial field"
      >
        <SingleFieldSelect
          placeholder="Select geo field"
          value={this.state.geoField}
          onChange={this.onGeoFieldSelect}
          filterField={Editor._filterGeoField}
          fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
        />
      </EuiFormRow>
    );
  }

  _renderTooltipConfig() {
    if (!this.state.indexPattern) {
      return;
    }

    let fieldSelectFormRow;
    if (this.state.showTooltip) {
      fieldSelectFormRow = (
        <EuiFormRow
          label="Fields displayed in tooltip"
        >
          <MultiFieldSelect
            placeholder="Select field(s)"
            value={this.state.tooltipProperties}
            onChange={this.onTooltipPropertiesSelect}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        {/* <EuiFormRow compressed>
          <EuiSwitch
            label="Show tooltip on feature mouseover"
            checked={this.state.showTooltip}
            onChange={this.onShowTooltipChange}
          />
        </EuiFormRow> */}

        {fieldSelectFormRow}
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>

        {/* <EuiFormRow
          label="Limit"
          helpText="Maximum documents retrieved from elasticsearch."
          compressed
        >
          <EuiFieldNumber
            placeholder="10"
            value={this.state.limit}
            onChange={this.onLimitChange}
            aria-label="Limit"
          />
        </EuiFormRow> */}


        <EuiFormRow
          label="Index pattern"
        >
          <IndexPatternSelect
            indexPatternId={this.state.indexPatternId}
            onChange={this.onIndexPatternSelect}
            placeholder="Select index pattern"
            fieldTypes={['geo_point', 'geo_shape']}
          />
        </EuiFormRow>

        {this._renderGeoSelect()}

        {this._renderTooltipConfig()}


        <EuiFormRow>
          <EuiSwitch
            label="Use map extent to filter data"
            checked={this.state.filterByMapBounds}
            onChange={this.onFilterByMapBoundsChange}
          />
        </EuiFormRow>

      </Fragment>
    );
  }
}
