/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_LAYERS } from './util';

interface Props {
  onChange: (typicalActual: ML_ANOMALY_LAYERS) => void;
  typicalActual: ML_ANOMALY_LAYERS;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class LayerSelector extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {};

  componentDidMount(): void {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onSelect = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const typicalActual: ML_ANOMALY_LAYERS = selectedOptions[0].value! as ML_ANOMALY_LAYERS;
    if (this._isMounted) {
      this.setState({ typicalActual });
      this.props.onChange(typicalActual);
    }
  };

  render() {
    const options = [{ value: this.props.typicalActual, label: this.props.typicalActual }];
    return (
      <EuiFormRow
        label={i18n.translate('xpack.ml.maps.typicalActualLabel', {
          defaultMessage: 'Type',
        })}
        display="columnCompressed"
      >
        <EuiComboBox
          singleSelection={true}
          onChange={this.onSelect}
          options={[
            {
              value: ML_ANOMALY_LAYERS.ACTUAL,
              label: i18n.translate('xpack.ml.maps.actualLabel', {
                defaultMessage: ML_ANOMALY_LAYERS.ACTUAL,
              }),
            },
            {
              value: ML_ANOMALY_LAYERS.TYPICAL,
              label: i18n.translate('xpack.ml.maps.typicalLabel', {
                defaultMessage: ML_ANOMALY_LAYERS.TYPICAL,
              }),
            },
            {
              value: ML_ANOMALY_LAYERS.TYPICAL_TO_ACTUAL,
              label: i18n.translate('xpack.ml.maps.typicalToActualLabel', {
                defaultMessage: ML_ANOMALY_LAYERS.TYPICAL_TO_ACTUAL,
              }),
            },
          ]}
          selectedOptions={options}
        />
      </EuiFormRow>
    );
  }
}
