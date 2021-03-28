/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import { EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { GeoFieldSelect } from '../../../components/geo_field_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { getGeoFields } from '../../../index_pattern_util';
import { ESTopHitsSourceDescriptor } from '../../../../common/descriptor_types';
import { IndexPattern, IFieldType } from '../../../../../src/plugins/data/common';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<ESTopHitsSourceDescriptor>) => void;
}

interface State {
  indexPattern: IndexPattern | null;
  geoFields: IFieldType[];
  geoFieldName: string | null;
  topHitsSplitField: string | null;
  topHitsSize: number;
}

export class CreateSourceEditor extends Component<Props, State> {
  state = {
    indexPattern: null,
    geoFields: [],
    geoFieldName: null,
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

  _previewLayer = () => {
    const { indexPattern, geoFieldName, topHitsSplitField, topHitsSize } = this.state;

    const sourceConfig =
      indexPattern && geoFieldName && topHitsSplitField
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
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

    return null;
    /* return (
      <Fragment>
        <EuiSpacer size="m" />
        <ScalingForm
          filterByMapBounds={this.state.filterByMapBounds}
          indexPatternId={this.state.indexPattern ? this.state.indexPattern.id : ''}
          onChange={this._onScalingPropChange}
          scalingType={this.state.scalingType}
          supportsClustering={doesGeoFieldSupportGeoTileAgg(
            this.state.indexPattern,
            this.state.geoFieldName
          )}
          clusteringDisabledReason={
            this.state.indexPattern
              ? getGeoTileAggNotSupportedReason(
                  this.state.indexPattern.fields.getByName(this.state.geoFieldName)
                )
              : null
          }
          termFields={getTermsFields(this.state.indexPattern.fields)}
          topHitsSplitField={this.state.topHitsSplitField}
          topHitsSize={this.state.topHitsSize}
        />
      </Fragment>
    );*/
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
