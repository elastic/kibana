/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiPanel } from '@elastic/eui';

import { SingleFieldSelect } from '../../../components/single_field_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { i18n } from '@kbn/i18n';
import { SCALING_TYPES } from '../../../../common/constants';
import { getGeoFields } from '../../../index_pattern_util';

const RESET_INDEX_PATTERN_STATE = {
  indexPattern: undefined,
  geoFields: undefined,
  geoFieldName: undefined,
};

export class CreateSourceEditor extends Component {
  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    ...RESET_INDEX_PATTERN_STATE,
  };

  _onIndexPatternSelect = (indexPattern) => {
    const geoFields = getGeoFields(indexPattern.fields);

    this.setState(
      {
        ...RESET_INDEX_PATTERN_STATE,
        indexPattern,
        geoFields,
      },
      () => {
        if (geoFields.length) {
          // make default selection, prefer aggregatable field over the first available
          const firstAggregatableGeoField = geoFields.find((geoField) => {
            return geoField.aggregatable;
          });
          const defaultGeoFieldName = firstAggregatableGeoField
            ? firstAggregatableGeoField
            : geoFields[0];
          this._onGeoFieldSelect(defaultGeoFieldName.name);
        }
      }
    );
  };

  _onGeoFieldSelect = (geoFieldName) => {
    this.setState(
      {
        geoFieldName,
      },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const { indexPattern, geoFieldName } = this.state;

    const sourceConfig =
      indexPattern && geoFieldName
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
            scalingType: SCALING_TYPES.MVT,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esSearch.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esSearch.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoFieldName}
          onChange={this._onGeoFieldSelect}
          fields={this.state.geoFields}
        />
      </EuiFormRow>
    );
  }

  render() {
    return (
      <EuiPanel>
        <GeoIndexPatternSelect
          value={this.state.indexPattern ? this.state.indexPattern.id : ''}
          onChange={this._onIndexPatternSelect}
        />

        {this._renderGeoSelect()}
      </EuiPanel>
    );
  }
}
