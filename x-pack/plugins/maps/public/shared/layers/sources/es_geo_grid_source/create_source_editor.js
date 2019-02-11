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
import { RENDER_AS } from './render_as';
import { indexPatternService } from '../../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';

import {
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
} from '@elastic/eui';

function filterGeoField({ type }) {
  return ['geo_point'].includes(type);
}

const requestTypeOptions = [
  {
    label: 'points',
    value: RENDER_AS.POINT
  },
  {
    label: 'grid rectangles',
    value: RENDER_AS.GRID
  },
  {
    label: 'heat map',
    value: RENDER_AS.HEATMAP
  }
];

export class CreateSourceEditor extends Component {

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    indexPatternId: '',
    geoField: '',
    requestType: requestTypeOptions[0],
    noGeoIndexPatternsExist: false,
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  onIndexPatternSelect = (indexPatternId) => {
    this.setState({
      indexPatternId,
    }, this.loadIndexPattern.bind(null, indexPatternId));
  };

  loadIndexPattern = (indexPatternId) => {
    this.setState({
      isLoadingIndexPattern: true,
      indexPattern: undefined,
      geoField: undefined,
    }, this.debouncedLoad.bind(null, indexPatternId));
  };

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
      this._onGeoFieldSelect(geoFields[0].name);
    }

  }, 300);

  _onGeoFieldSelect = (geoField) => {
    this.setState({
      geoField
    }, this.previewLayer);
  };

  _onRequestTypeSelect =  (selectedOptions) => {
    this.setState({
      requestType: selectedOptions[0]
    }, this.previewLayer);
  };

  previewLayer = () => {
    const {
      indexPatternId,
      geoField,
      requestType
    } = this.state;
    if (indexPatternId && geoField) {
      this.props.onSelect({
        indexPatternId,
        geoField,
        requestType: requestType.value
      });
    }
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  }

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow label="Geospatial field">
        <SingleFieldSelect
          placeholder="Select geo field"
          value={this.state.geoField}
          onChange={this._onGeoFieldSelect}
          filterField={filterGeoField}
          fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
        />
      </EuiFormRow>
    );
  }

  _renderLayerSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow label="Show as">
        <EuiComboBox
          placeholder="Select a single option"
          singleSelection={{ asPlainText: true }}
          options={requestTypeOptions}
          selectedOptions={[this.state.requestType]}
          onChange={this._onRequestTypeSelect}
          isClearable={false}
        />
      </EuiFormRow>);
  }

  _renderIndexPatternSelect() {
    return (
      <EuiFormRow label="Index pattern">
        <IndexPatternSelect
          isDisabled={this.state.noGeoIndexPatternsExist}
          indexPatternId={this.state.indexPatternId}
          onChange={this.onIndexPatternSelect}
          placeholder="Select index pattern"
          fieldTypes={['geo_point']}
          onNoIndexPatterns={this._onNoIndexPatterns}
        />
      </EuiFormRow>
    );
  }

  _renderNoIndexPatternWarning() {
    if (!this.state.noGeoIndexPatternsExist) {
      return null;
    }

    return (
      <Fragment>
        <NoIndexPatternCallout />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderNoIndexPatternWarning()}
        {this._renderIndexPatternSelect()}
        {this._renderGeoSelect()}
        {this._renderLayerSelect()}
      </Fragment>
    );
  }
}
