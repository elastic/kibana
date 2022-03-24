/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';

import type { DataView, DataViewField } from 'src/plugins/data/common';
import { SCALING_TYPES } from '../../../../../common/constants';
import { GeoFieldSelect } from '../../../../components/geo_field_select';
import { GeoIndexPatternSelect } from '../../../../components/geo_index_pattern_select';
import { getGeoFields, getTermsFields, getSortFields } from '../../../../index_pattern_util';
import { ESSearchSourceDescriptor } from '../../../../../common/descriptor_types';
import { SortDirection } from '../../../../../../../../src/plugins/data/public';
import { TopHitsForm } from './top_hits_form';
import { OnSourceChangeArgs } from '../../source';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<ESSearchSourceDescriptor> | null) => void;
}

interface State {
  indexPattern: DataView | null;
  geoFields: DataViewField[];
  geoFieldName: string | null;
  sortField: string | null;
  sortFields: DataViewField[];
  sortOrder: SortDirection;
  termFields: DataViewField[];
  topHitsSplitField: string | null;
  topHitsSize: number;
}

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {
    indexPattern: null,
    geoFields: [],
    geoFieldName: null,
    sortField: null,
    sortFields: [],
    sortOrder: SortDirection.desc,
    termFields: [],
    topHitsSplitField: null,
    topHitsSize: 1,
  };

  _onIndexPatternSelect = (indexPattern: DataView) => {
    const geoFields = getGeoFields(indexPattern.fields);

    this.setState(
      {
        indexPattern,
        geoFields,
        geoFieldName: geoFields.length ? geoFields[0].name : null,
        sortField: indexPattern.timeFieldName ? indexPattern.timeFieldName : null,
        sortFields: getSortFields(indexPattern.fields),
        termFields: getTermsFields(indexPattern.fields),
        topHitsSplitField: null,
      },
      this._previewLayer
    );
  };

  _onGeoFieldSelect = (geoFieldName?: string) => {
    this.setState({ geoFieldName: geoFieldName ? geoFieldName : null }, this._previewLayer);
  };

  _onTopHitsPropChange = ({ propName, value }: OnSourceChangeArgs) => {
    this.setState(
      // @ts-expect-error
      { [propName]: value },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const { indexPattern, geoFieldName, sortField, sortOrder, topHitsSplitField, topHitsSize } =
      this.state;

    const tooltipProperties: string[] = [];
    if (topHitsSplitField) {
      tooltipProperties.push(topHitsSplitField);
    }
    if (indexPattern && indexPattern.timeFieldName) {
      tooltipProperties.push(indexPattern.timeFieldName);
    }

    const sourceConfig =
      indexPattern && geoFieldName && sortField && topHitsSplitField
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
            scalingType: SCALING_TYPES.TOP_HITS,
            sortField,
            sortOrder,
            tooltipProperties,
            topHitsSplitField,
            topHitsSize,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _renderGeoSelect() {
    return this.state.indexPattern ? (
      <GeoFieldSelect
        value={this.state.geoFieldName ? this.state.geoFieldName : ''}
        onChange={this._onGeoFieldSelect}
        geoFields={this.state.geoFields}
      />
    ) : null;
  }

  _renderTopHitsPanel() {
    if (!this.state.indexPattern || !this.state.indexPattern.id || !this.state.geoFieldName) {
      return null;
    }

    return (
      <TopHitsForm
        indexPatternId={this.state.indexPattern.id}
        isColumnCompressed={false}
        onChange={this._onTopHitsPropChange}
        sortField={this.state.sortField ? this.state.sortField : ''}
        sortFields={this.state.sortFields}
        sortOrder={this.state.sortOrder}
        termFields={this.state.termFields}
        topHitsSplitField={this.state.topHitsSplitField}
        topHitsSize={this.state.topHitsSize}
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
        />

        {this._renderGeoSelect()}

        {this._renderTopHitsPanel()}
      </EuiPanel>
    );
  }
}
