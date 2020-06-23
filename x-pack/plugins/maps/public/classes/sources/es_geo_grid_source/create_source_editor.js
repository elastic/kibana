/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import { ES_GEO_FIELD_TYPES } from '../../../../common/constants';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getIndexPatternService, getIndexPatternSelectComponent } from '../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSpacer } from '@elastic/eui';
import {
  getFieldsWithGeoTileAgg,
  getGeoFields,
  getGeoTileAggNotSupportedReason,
  supportsGeoTileAgg,
} from '../../../index_pattern_util';
import { RenderAsSelect } from './render_as_select';

function doesNotSupportGeoTileAgg(field) {
  return !supportsGeoTileAgg(field);
}

export class CreateSourceEditor extends Component {
  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    indexPatternId: '',
    geoField: '',
    requestType: this.props.requestType,
    noGeoIndexPatternsExist: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  onIndexPatternSelect = (indexPatternId) => {
    this.setState(
      {
        indexPatternId,
      },
      this.loadIndexPattern.bind(null, indexPatternId)
    );
  };

  loadIndexPattern = (indexPatternId) => {
    this.setState(
      {
        isLoadingIndexPattern: true,
        indexPattern: undefined,
        geoField: undefined,
      },
      this.debouncedLoad.bind(null, indexPatternId)
    );
  };

  debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
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
      indexPattern: indexPattern,
    });

    //make default selection
    const geoFieldsWithGeoTileAgg = getFieldsWithGeoTileAgg(indexPattern.fields);
    if (geoFieldsWithGeoTileAgg[0]) {
      this._onGeoFieldSelect(geoFieldsWithGeoTileAgg[0].name);
    }
  }, 300);

  _onGeoFieldSelect = (geoField) => {
    this.setState(
      {
        geoField,
      },
      this.previewLayer
    );
  };

  _onRequestTypeSelect = (newValue) => {
    this.setState(
      {
        requestType: newValue,
      },
      this.previewLayer
    );
  };

  previewLayer = () => {
    const { indexPatternId, geoField, requestType } = this.state;

    const sourceConfig =
      indexPatternId && geoField ? { indexPatternId, geoField, requestType } : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoGrid.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esGeoGrid.geofieldPlaceholder', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoField}
          onChange={this._onGeoFieldSelect}
          fields={
            this.state.indexPattern ? getGeoFields(this.state.indexPattern.fields) : undefined
          }
          isFieldDisabled={doesNotSupportGeoTileAgg}
          getFieldDisabledReason={getGeoTileAggNotSupportedReason}
        />
      </EuiFormRow>
    );
  }

  _renderRenderAsSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <RenderAsSelect renderAs={this.state.requestType} onChange={this._onRequestTypeSelect} />
    );
  }

  _renderIndexPatternSelect() {
    const IndexPatternSelect = getIndexPatternSelectComponent();

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoGrid.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        })}
      >
        <IndexPatternSelect
          isDisabled={this.state.noGeoIndexPatternsExist}
          indexPatternId={this.state.indexPatternId}
          onChange={this.onIndexPatternSelect}
          placeholder={i18n.translate('xpack.maps.source.esGeoGrid.indexPatternPlaceholder', {
            defaultMessage: 'Select index pattern',
          })}
          fieldTypes={ES_GEO_FIELD_TYPES}
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
        {this._renderRenderAsSelect()}
      </Fragment>
    );
  }
}
