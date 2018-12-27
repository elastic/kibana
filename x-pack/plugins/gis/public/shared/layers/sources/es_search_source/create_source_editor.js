/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { MultiFieldSelect } from '../../../components/multi_field_select';
import { indexPatternService } from '../../../../kibana_services';

import {
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

function filterGeoField(field) {
  return ['geo_point', 'geo_shape'].includes(field.type);
}

const DEFAULT_LIMIT = 2048;

export class CreateSourceEditor extends Component {

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
    const geoFields = indexPattern.fields.filter(filterGeoField);
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
          filterField={filterGeoField}
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
