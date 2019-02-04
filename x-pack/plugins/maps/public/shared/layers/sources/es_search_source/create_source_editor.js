/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSpacer } from '@elastic/eui';

import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { indexPatternService } from '../../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';

function filterGeoField(field) {
  return ['geo_point', 'geo_shape'].includes(field.type);
}

export class CreateSourceEditor extends Component {

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
  }

  state = {
    isLoadingIndexPattern: false,
    indexPatternId: '',
    geoField: '',
    noGeoIndexPatternsExist: false,
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

  previewLayer = () => {
    const {
      indexPatternId,
      geoField,
    } = this.state;
    if (indexPatternId && geoField) {
      this.props.onSelect({
        indexPatternId,
        geoField,
      });
    }
  }

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
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

        <EuiFormRow
          label="Index pattern"
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.state.indexPatternId}
            onChange={this.onIndexPatternSelect}
            placeholder="Select index pattern"
            fieldTypes={['geo_point', 'geo_shape']}
            onNoIndexPatterns={this._onNoIndexPatterns}
          />
        </EuiFormRow>

        {this._renderGeoSelect()}

      </Fragment>
    );
  }
}
