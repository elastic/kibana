/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { EMSFileSelect } from '../../../components/ems_file_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { getIndexPatternSelectComponent } from '../../../kibana_services';

export enum BOUNDARIES_SOURCE {
  ELASTICSEARCH = 'ELASTICSEARCH',
  EMS = 'EMS',
}

const BOUNDARIES_OPTIONS = [
  {
    id: BOUNDARIES_SOURCE.ELASTICSEARCH,
    label: i18n.translate('xpack.maps.choropleth.boundaries.elasticsearch', {
      defaultMessage: 'Points, lines, or polygons from Elasticsearch',
    }),
  },
  {
    id: BOUNDARIES_SOURCE.EMS,
    label: i18n.translate('xpack.maps.choropleth.boundaries.ems', {
      defaultMessage: 'Administrative boundaries from Elastic Maps Service',
    }),
  },
];

const IndexPatternSelect = getIndexPatternSelectComponent();

interface State {
  leftSource: BOUNDARIES_SOURCE;
  leftIndexPatternId: string | null;
  leftGeofieldName: string | null;
  leftEsJoinField: string | null;
  leftEmsFileId: string | null;
  leftEmsJoinField: string | null;
  rightIndexPatternId: string | null;
  rightKey: string | null;
}

export class LayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    leftSource: BOUNDARIES_SOURCE.ELASTICSEARCH,
    leftIndexPatternId: null,
    leftGeofieldName: null,
    leftEsJoinField: null,
    leftEmsFileId: null,
    leftEmsJoinField: null,
    rightIndexPatternId: null,
    rightKey: null,
  };

  _onLeftSourceChange = (optionId: string) => {
    this.setState({ leftSource: optionId }, this._previewLayer);
  };

  _onLeftIndexPatternChange = (indexPatternId: string) => {
    this.setState({ leftIndexPatternId: indexPatternId }, this._previewLayer);
  };

  _onEmsFileChange = (emFileId: string) => {
    this.setState({ leftEmsFileId: emFileId }, this._previewLayer);
  };

  _isLeftConfigComplete() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      return (
        !!this.state.leftIndexPatternId &&
        !!this.state.leftGeofieldName &&
        !!this.state.leftEsJoinField
      );
    } else {
      return !!this.state.leftEmsFileId && !!this.state.leftEmsFileId;
    }
  }

  _isRightConfigComplete() {
    return !!this.state.rightIndexPatternId && !!this.state.rightKey;
  }

  _previewLayer() {
    if (!this._isLeftConfigComplete() || !this._isRightConfigComplete()) {
      return;
    }

    /* const layerDescriptor = createLayerDescriptor({
      layer: this.state.layer,
      metric: this.state.metric,
      display: this.state.display,
    });
    this.props.previewLayers(layerDescriptor ? [layerDescriptor] : []);*/
  }

  _renderLeftSource() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      return (
        <GeoIndexPatternSelect
          value={this.state.leftIndexPatternId}
          onChange={this._onLeftIndexPatternChange}
        />
      );
    } else {
      return <EMSFileSelect value={this.state.leftEmsFileId} onChange={this._onEmsFileChange} />;
    }
  }

  render() {
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.maps.choropleth.boundariesLabel', {
            defaultMessage: 'Boundaries source',
          })}
        >
          <EuiRadioGroup
            options={BOUNDARIES_OPTIONS}
            idSelected={this.state.leftSource}
            onChange={this._onLeftSourceChange}
          />
        </EuiFormRow>

        {this._renderLeftSource()}
      </>
    );
  }
}
