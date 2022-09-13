/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFormRow, EuiPanel } from '@elastic/eui';
import { DataView } from '@kbn/data-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/public';

import { i18n } from '@kbn/i18n';
import { ESSearchSourceDescriptor } from '../../../../common/descriptor_types';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { SCALING_TYPES } from '../../../../common/constants';
import { getGeoFields } from '../../../index_pattern_util';

interface Props {
  onSourceConfigChange: (
    sourceConfig: Partial<ESSearchSourceDescriptor> | null,
    isPointsOnly: boolean
  ) => void;
}

interface State {
  indexPattern: DataView | undefined;
  geoFields: DataViewField[] | undefined;
  geoFieldName: string | undefined;
}

const RESET_INDEX_PATTERN_STATE: State = {
  indexPattern: undefined,
  geoFields: undefined,
  geoFieldName: undefined,
};

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {
    ...RESET_INDEX_PATTERN_STATE,
  };

  _onIndexPatternSelect = (indexPattern: DataView) => {
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

  _onGeoFieldSelect = (geoFieldName?: string) => {
    this.setState(
      {
        geoFieldName,
      },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const { indexPattern, geoFieldName } = this.state;

    const field = geoFieldName && indexPattern?.getFieldByName(geoFieldName);

    const sourceConfig =
      indexPattern && geoFieldName
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
            scalingType: SCALING_TYPES.MVT,
          }
        : null;
    const isPointsOnly = field ? field.type === 'geo_point' : false;
    this.props.onSourceConfigChange(sourceConfig, isPointsOnly);
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
          value={this.state.geoFieldName ? this.state.geoFieldName : null}
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
          value={
            this.state.indexPattern && this.state.indexPattern.id ? this.state.indexPattern.id : ''
          }
          onChange={this._onIndexPatternSelect}
        />

        {this._renderGeoSelect()}
      </EuiPanel>
    );
  }
}
