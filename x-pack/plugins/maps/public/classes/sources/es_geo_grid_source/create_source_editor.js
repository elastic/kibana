/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { SingleFieldSelect } from '../../../components/single_field_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiPanel } from '@elastic/eui';
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
    indexPattern: null,
    geoField: '',
    requestType: this.props.requestType,
  };

  onIndexPatternSelect = (indexPattern) => {
    this.setState(
      {
        indexPattern,
      },
      () => {
        //make default selection
        const geoFieldsWithGeoTileAgg = getFieldsWithGeoTileAgg(indexPattern.fields);
        if (geoFieldsWithGeoTileAgg[0]) {
          this._onGeoFieldSelect(geoFieldsWithGeoTileAgg[0].name);
        }
      }
    );
  };

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
    const { indexPattern, geoField, requestType } = this.state;

    const sourceConfig =
      indexPattern && geoField ? { indexPatternId: indexPattern.id, geoField, requestType } : null;
    this.props.onSourceConfigChange(sourceConfig);
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

  render() {
    return (
      <EuiPanel>
        <GeoIndexPatternSelect
          value={this.state.indexPattern ? this.state.indexPattern.id : ''}
          onChange={this.onIndexPatternSelect}
        />
        {this._renderGeoSelect()}
        {this._renderRenderAsSelect()}
      </EuiPanel>
    );
  }
}
