/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onChange: (typicalActual: 'typical' | 'actual') => void;
  typicalActual: 'typical' | 'actual';
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
    const typicalActual: 'typical' | 'actual' = selectedOptions[0].value! as 'typical' | 'actual';
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
            { value: 'typical', label: 'typical' },
            { value: 'actual', label: 'actual' },
          ]}
          selectedOptions={options}
        />
      </EuiFormRow>
    );
  }
}
