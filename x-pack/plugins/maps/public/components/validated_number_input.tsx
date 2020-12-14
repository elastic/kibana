/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent, MouseEvent } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

interface State {
  value: number | string;
  prevValue: number;
  errorMessage: string;
  isValid: boolean;
}

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

function isNumberValid(value: number | string, min: number, max: number) {
  const parsedValue = parseInt(value.toString(), 10);

  if (isNaN(parsedValue)) {
    return {
      isValid: false,
      errorMessage: i18n.translate('xpack.maps.validatedNumberInput.invalidNumberErrorMessage', {
        defaultMessage: 'Invalid number',
      }),
    };
  }

  const isValid = parsedValue >= min && parsedValue <= max;
  return {
    parsedValue,
    isValid,
    errorMessage: isValid
      ? ''
      : i18n.translate('xpack.maps.validatedNumberInput.invalidClampErrorMessage', {
          defaultMessage: 'Value must be between {min} and {max}',
          values: {
            min,
            max,
          },
        }),
  };
}

export class ValidatedNumberInput extends Component<Props, State> {
  // @ts-expect-error state populated by getDerivedStateFromProps
  state: State = {};

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.value !== prevState.prevValue) {
      const { isValid, errorMessage } = isNumberValid(
        nextProps.value,
        nextProps.min,
        nextProps.max
      );
      return {
        value: nextProps.value,
        prevValue: nextProps.value,
        isValid,
        errorMessage,
      };
    }

    return null;
  }

  _submit = _.debounce((value) => {
    this.props.onChange(value);
  }, 250);

  _onChange = (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    const value = (e.target as HTMLInputElement).value;
    const { isValid, errorMessage, parsedValue } = isNumberValid(
      value,
      this.props.min,
      this.props.max
    );

    this.setState({
      value,
      errorMessage,
      isValid,
    });

    if (isValid) {
      this._submit(parsedValue);
    }
  };

  render() {
    return (
      <EuiFormRow
        label={this.props.label}
        isInvalid={!this.state.isValid}
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        display="columnCompressed"
      >
        <EuiFieldNumber
          min={this.props.min}
          max={this.props.max}
          value={this.state.value}
          onChange={this._onChange}
          aria-label="number select"
        />
      </EuiFormRow>
    );
  }
}
