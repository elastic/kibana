/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { RenderWizardArguments } from '../../layer_wizard_registry';

export enum BOUNDARIES_SOURCE {
  ELASTICSEARCH = 'ELASTICSEARCH',
  EMS = 'EMS',
}

const BOUNDARIES_OPTIONS = [
  {
    id: BOUNDARIES_SOURCE.ELASTICSEARCH,
    label: i18n.translate('xpack.maps.choropleth.boundaries.elasticsearch', {
      defaultMessage: 'Vectors from Elasticsearch',
    }),
  },
  {
    id: BOUNDARIES_SOURCE.EMS,
    label: i18n.translate('xpack.maps.choropleth.boundaries.ems', {
      defaultMessage: 'Administrative boundaries from Elastic Maps Service',
    }),
  },
];

interface State {
  leftSource: BOUNDARIES_SOURCE;
  leftIndexPatternId: string | null;
  leftEmsFileId: string | null;
  leftKey: string | null;
  rightIndexPatternId: string | null;
  rightKey: string | null;
}

export class LayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    leftSource: BOUNDARIES_SOURCE.ELASTICSEARCH,
    leftIndexPatternId: null,
    leftEmsFileId: null,
    leftKey: null,
    rightIndexPatternId: null,
    rightKey: null,
  };

  _onLeftSourceChange = (optionId) => {
    this.setState({ leftSource: optionId }, this._previewLayer);
  };

  _isLeftConfigComplete() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      return !!this.state.leftIndexPatternId && !!this.state.leftKey;
    } else {
      return !!this.state.leftEmsFileId;
    }
  }

  _isRightConfigComplete() {
    return !!this.state.rightIndexPatternId && !!this.state.rightKey;
  }

  _previewLayer() {
    /* const layerDescriptor = createLayerDescriptor({
      layer: this.state.layer,
      metric: this.state.metric,
      display: this.state.display,
    });
    this.props.previewLayers(layerDescriptor ? [layerDescriptor] : []);*/
  }

  _renderLeftSource() {
    if (this.state.leftSource === BOUNDARIES_SOURCE) {
      return null;
    }

    return null;
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
