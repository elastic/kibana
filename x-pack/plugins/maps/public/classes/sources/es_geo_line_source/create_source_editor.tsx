/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { DataView } from 'src/plugins/data/common';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiPanel } from '@elastic/eui';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';

import { getGeoPointFields } from '../../../index_pattern_util';
import { GeoLineForm } from './geo_line_form';

interface Props {
  onSourceConfigChange: (
    sourceConfig: {
      indexPatternId: string;
      geoField: string;
      splitField: string;
      sortField: string;
    } | null
  ) => void;
}

interface State {
  indexPattern: DataView | null;
  geoField: string;
  splitField: string;
  sortField: string;
}

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {
    indexPattern: null,
    geoField: '',
    splitField: '',
    sortField: '',
  };

  _onIndexPatternSelect = (indexPattern: DataView) => {
    const pointFields = getGeoPointFields(indexPattern.fields);
    this.setState(
      {
        indexPattern,
        geoField: pointFields.length ? pointFields[0].name : '',
        sortField: indexPattern.timeFieldName ? indexPattern.timeFieldName : '',
      },
      this.previewLayer
    );
  };

  _onGeoFieldSelect = (geoField?: string) => {
    if (geoField === undefined) {
      return;
    }

    this.setState(
      {
        geoField,
      },
      this.previewLayer
    );
  };

  _onSplitFieldSelect = (newValue: string) => {
    this.setState(
      {
        splitField: newValue,
      },
      this.previewLayer
    );
  };

  _onSortFieldSelect = (newValue: string) => {
    this.setState(
      {
        sortField: newValue,
      },
      this.previewLayer
    );
  };

  previewLayer = () => {
    const { indexPattern, geoField, splitField, sortField } = this.state;

    const sourceConfig =
      indexPattern && indexPattern.id && geoField && splitField && sortField
        ? { indexPatternId: indexPattern.id, geoField, splitField, sortField }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoLine.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esGeoLine.geofieldPlaceholder', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoField}
          onChange={this._onGeoFieldSelect}
          fields={getGeoPointFields(this.state.indexPattern.fields)}
        />
      </EuiFormRow>
    );
  }

  _renderGeoLineForm() {
    if (!this.state.indexPattern || !this.state.geoField) {
      return null;
    }

    return (
      <GeoLineForm
        indexPattern={this.state.indexPattern}
        onSortFieldChange={this._onSortFieldSelect}
        onSplitFieldChange={this._onSplitFieldSelect}
        sortField={this.state.sortField}
        splitField={this.state.splitField}
      />
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
          isGeoPointsOnly={true}
        />
        {this._renderGeoSelect()}
        {this._renderGeoLineForm()}
      </EuiPanel>
    );
  }
}
