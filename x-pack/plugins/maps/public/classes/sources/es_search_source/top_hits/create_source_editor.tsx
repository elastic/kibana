/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import { EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SCALING_TYPES } from '../../../../../common/constants';
import { GeoFieldSelect } from '../../../../components/geo_field_select';
import { GeoIndexPatternSelect } from '../../../../components/geo_index_pattern_select';
import { getGeoFields, getTermsFields } from '../../../../index_pattern_util';
import { ESSearchSourceDescriptor } from '../../../../../common/descriptor_types';
import {
  IndexPattern,
  IFieldType,
  SortDirection,
} from '../../../../../../../../src/plugins/data/common';
import { TopHitsForm } from './top_hits_form';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<ESSearchSourceDescriptor>) => void;
}

interface State {
  indexPattern: IndexPattern | null;
  geoFields: IFieldType[];
  geoFieldName: string | null;
  termFields: IFieldType[];
  topHitsSplitField: string | null;
  topHitsSize: number;
}

export class CreateSourceEditor extends Component<Props, State> {
  state = {
    indexPattern: null,
    geoFields: [],
    geoFieldName: null,
    termFields: [],
    topHitsSplitField: null,
    topHitsSize: 1,
  };

  _onIndexPatternSelect = (indexPattern: IndexPattern) => {
    const geoFields = getGeoFields(indexPattern.fields);

    this.setState(
      {
        indexPattern,
        geoFields,
        geoFieldName: null,
        termFields: getTermsFields(indexPattern.fields),
        topHitsSplitField: null,
      },
      () => {
        if (geoFields.length) {
          this._onGeoFieldSelect(geoFields[0].name);
        }
      }
    );
  };

  _onGeoFieldSelect = (geoFieldName: string) => {
    this.setState({ geoFieldName }, this._previewLayer);
  };

  _onTopHitsPropChange = ({ propName, value }) => {
    // @ts-expect-error
    this.setState(
      {
        [propName]: value,
      },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const { indexPattern, geoFieldName, topHitsSplitField, topHitsSize } = this.state;

    const tooltipProperties: string[] = [];
    if (topHitsSplitField) {
      tooltipProperties.push(topHitsSplitField);
    }
    if (indexPattern.timeFieldName) {
      tooltipProperties.push(indexPattern.timeFieldName);
    }

    const sourceConfig =
      indexPattern && geoFieldName && topHitsSplitField
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
            scalingType: SCALING_TYPES.TOP_HITS,
            sortField: indexPattern.timeFieldName ? indexPattern.timeFieldName : '',
            sortOrder: SortDirection.desc,
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
        value={this.state.geoFieldName}
        onChange={this._onGeoFieldSelect}
        geoFields={this.state.geoFields}
      />
    ) : null;
  }

  _renderTopHitsPanel() {
    if (!this.state.indexPattern || !this.state.geoFieldName) {
      return null;
    }

    return (
      <TopHitsForm
        indexPatternId={this.state.indexPattern.id}
        isColumnCompressed={false}
        onChange={this._onTopHitsPropChange}
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
          value={this.state.indexPattern ? this.state.indexPattern.id : ''}
          onChange={this._onIndexPatternSelect}
        />

        {this._renderGeoSelect()}

        {this._renderTopHitsPanel()}
      </EuiPanel>
    );
  }
}
