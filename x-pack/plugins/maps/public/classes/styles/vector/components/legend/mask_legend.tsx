/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiTextAlign } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getMaskI18nDescription, getMaskI18nValue, Mask } from '../../../../layers/vector_layer/mask';

interface Props {
  esAggField: IESAggField;
  operator: MASK_OPERATOR;
  value: number;
}

interface State {
  aggLabel: string;
}

export class MaskLegend extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    aggLabel: i18n.translate('xpack.maps.maskLegend.valueLabel', {
      defaultMessage: 'value',
    })
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadAggLabel();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._loadAggLabel();
  }

  _loadAggLabel = async () => {
    const aggLabel = await this.props.esAggField.getLabel();
    if (this._isMounted && aggLabel !== this.state.aggLabel) {
      this.setState({ aggLabel });
    }
  }

  render() {
    return (
      <EuiTextAlign textAlign="left">
        <p>{`${getMaskI18nDescription('bucket', this.state.aggLabel)} ${getMaskI18nValue(this.props.operator, this.props.value)}`}</p>
      </EuiTextAlign>
    );
  }
}