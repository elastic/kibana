/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { EuiPanel } from '@elastic/eui';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { GeoFieldSelect } from '../../../components/geo_field_select';
import { ESGeoLineSourceDescriptor } from '../../../../common/descriptor_types';
import { getGeoPointFields, getIsTimeseries } from '../../../index_pattern_util';
import { GeoLineForm } from './geo_line_form';
import { DEFAULT_LINE_SIMPLIFICATION_SIZE } from './constants';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<ESGeoLineSourceDescriptor> | null) => void;
}

interface State {
  indexPattern: DataView | null;
  pointFields: DataViewField[];
  geoField: string;
  groupByTimeseries: boolean;
  splitField: string;
  sortField: string;
  lineSimplificationSize: number;
}

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {
    indexPattern: null,
    pointFields: [],
    geoField: '',
    groupByTimeseries: false,
    splitField: '',
    sortField: '',
    lineSimplificationSize: DEFAULT_LINE_SIMPLIFICATION_SIZE,
  };

  _onIndexPatternSelect = (indexPattern: DataView) => {
    const pointFields = getGeoPointFields(indexPattern.fields);
    this.setState(
      {
        indexPattern,
        pointFields,
        groupByTimeseries: getIsTimeseries(indexPattern),
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

  _onGroupByTimeseriesChange = (groupByTimeseries: boolean) => {
    this.setState(
      {
        groupByTimeseries,
      },
      this.previewLayer
    );
  };

  _onLineSimplificationSizeChange = (lineSimplificationSize: number) => {
    this.setState(
      {
        lineSimplificationSize,
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
    const {
      indexPattern,
      geoField,
      groupByTimeseries,
      splitField,
      sortField,
      lineSimplificationSize,
    } = this.state;

    const sourceConfig =
      indexPattern &&
      indexPattern.id &&
      geoField &&
      (groupByTimeseries || (splitField && sortField))
        ? {
            indexPatternId: indexPattern.id,
            geoField,
            groupByTimeseries,
            lineSimplificationSize,
            splitField,
            sortField,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <GeoFieldSelect
        value={this.state.geoField}
        onChange={this._onGeoFieldSelect}
        geoFields={this.state.pointFields}
        isClearable={false}
      />
    );
  }

  _renderGeoLineForm() {
    if (!this.state.indexPattern || !this.state.geoField) {
      return null;
    }

    return (
      <GeoLineForm
        isColumnCompressed={false}
        indexPattern={this.state.indexPattern}
        onGroupByTimeseriesChange={this._onGroupByTimeseriesChange}
        onLineSimplificationSizeChange={this._onLineSimplificationSizeChange}
        onSortFieldChange={this._onSortFieldSelect}
        onSplitFieldChange={this._onSplitFieldSelect}
        groupByTimeseries={this.state.groupByTimeseries}
        lineSimplificationSize={this.state.lineSimplificationSize}
        sortField={this.state.sortField}
        splitField={this.state.splitField}
      />
    );
  }

  render() {
    return (
      <EuiPanel>
        <GeoIndexPatternSelect
          dataView={this.state.indexPattern}
          onChange={this._onIndexPatternSelect}
          isGeoPointsOnly={true}
        />
        {this._renderGeoSelect()}
        {this._renderGeoLineForm()}
      </EuiPanel>
    );
  }
}
