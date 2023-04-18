/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiText } from '@elastic/eui';
import { FIELD_ORIGIN, MASK_OPERATOR } from '../../../../../../common/constants';
import type { IESAggField } from '../../../../fields/agg';
import type { IESAggSource } from '../../../../sources/es_agg_source';
import { getMaskI18nDescription, getMaskI18nValue } from '../../../../layers/vector_layer/mask';

interface Props {
  esAggField: IESAggField;
  operator: MASK_OPERATOR;
  value: number;
}

interface State {
  aggLabel?: string;
}

export class MaskLegend extends Component<Props, State> {
  private _isMounted = false;

  state: State = {};

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
  };

  _getBucketsName() {
    const source = this.props.esAggField.getSource();
    return 'getBucketsName' in (source as IESAggSource)
      ? (source as IESAggSource).getBucketsName()
      : undefined;
  }

  render() {
    const maskDescription = getMaskI18nDescription({
      bucketsName: this._getBucketsName(),
      aggLabel: this.state.aggLabel,
      isJoin: this.props.esAggField.getOrigin() === FIELD_ORIGIN.JOIN,
    });
    return (
      <EuiText size="xs" textAlign="left" color="subdued">
        <small>
          <strong>{`${maskDescription} ${getMaskI18nValue(
            this.props.operator,
            this.props.value
          )}`}</strong>
        </small>
      </EuiText>
    );
  }
}
