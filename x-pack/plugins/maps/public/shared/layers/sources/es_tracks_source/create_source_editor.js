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
import { i18n } from '@kbn/i18n';
import {
  indexPatternLabel,
  geoFieldLabel,
  timeFieldLabel,
  splitFieldLabel,
} from './constants';

function filterGeoField(field) {
  return field.type === 'geo_point';
}

function filterDateField(field) {
  return field.type === 'date';
}

function filterTermsField(field) {
  return field.aggregatable && ['number', 'boolean', 'date', 'ip',  'string'].includes(field.type);
}

export class CreateSourceEditor extends Component {

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    indexPattern: undefined,
    indexPatternId: '',
    geoField: undefined,
    timeField: undefined,
    splitField: undefined,
    noGeoIndexPatternsExist: false,
  };

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
      timeField: undefined,
      splitField: undefined,
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
      this.onGeoFieldSelect(geoFields[0].name);
    }

    // prefer default time field
    if (indexPattern.timeFieldName) {
      this.onTimeFieldSelect(indexPattern.timeFieldName);
    } else {
      // fall back to first date field in index
      const dateFields = indexPattern.fields.filter(filterDateField);
      if (dateFields[0]) {
        this.onTimeFieldSelect(dateFields[0].name);
      }
    }
  }, 300);

  onGeoFieldSelect = (geoField) => {
    this.setState({
      geoField
    }, this.previewLayer);
  };

  onTimeFieldSelect = (timeField) => {
    this.setState({
      timeField
    }, this.previewLayer);
  };

  onSplitFieldSelect = (splitField) => {
    this.setState({
      splitField
    }, this.previewLayer);
  };

  previewLayer = () => {
    const {
      indexPatternId,
      geoField,
      timeField,
      splitField,
    } = this.state;

    const sourceConfig = (indexPatternId && geoField && timeField && splitField)
      ? { indexPatternId, geoField, timeField, splitField }
      : null;
    this.props.onSelect(sourceConfig);
  }

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  }

  _renderFieldSelects() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <Fragment>
        <EuiFormRow
          label={geoFieldLabel}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esTracks.geofieldPlaceholder', {
              defaultMessage: 'Select point field'
            })}
            value={this.state.geoField}
            onChange={this.onGeoFieldSelect}
            filterField={filterGeoField}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>

        <EuiFormRow
          label={timeFieldLabel}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esTracks.timeFieldPlaceholder', {
              defaultMessage: 'Select time field'
            })}
            value={this.state.timeField}
            onChange={this.onTimeFieldSelect}
            filterField={filterDateField}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>

        <EuiFormRow
          label={splitFieldLabel}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esTracks.splitFieldPlaceholder', {
              defaultMessage: 'Select split field'
            })}
            value={this.state.splitField}
            onChange={this.onSplitFieldSelect}
            filterField={filterTermsField}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>

      </Fragment>
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
          label={indexPatternLabel}
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.state.indexPatternId}
            onChange={this.onIndexPatternSelect}
            placeholder={i18n.translate('xpack.maps.source.esTracks.indexPatternPlaceholder', {
              defaultMessage: 'Select index pattern'
            })}
            fieldTypes={['geo_point']}
            onNoIndexPatterns={this._onNoIndexPatterns}
          />
        </EuiFormRow>

        {this._renderFieldSelects()}

      </Fragment>
    );
  }
}
