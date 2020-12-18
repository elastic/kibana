/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent, ReactNode } from 'react';
// @ts-expect-error
import { EuiFieldNumber, EuiFormRow, EuiFormRowDisplayKeys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

interface State {
  value: number | string;
  errorMessage: string;
  isValid: boolean;
}

interface Props {
  initialValue: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  display?: EuiFormRowDisplayKeys;
  helpText?: ReactNode;
}

function getErrorMessage(min: number, max: number): string {
  return i18n.translate('xpack.maps.validatedNumberInput.invalidClampErrorMessage', {
    defaultMessage: 'Must be between {min} and {max}',
    values: {
      min,
      max,
    },
  });
}

function isNumberValid(value: number | string, min: number, max: number) {
  const parsedValue = parseFloat(value.toString());

  if (isNaN(parsedValue)) {
    return {
      isValid: false,
      errorMessage: getErrorMessage(min, max),
    };
  }

  const isValid = parsedValue >= min && parsedValue <= max;
  return {
    parsedValue,
    isValid,
    errorMessage: isValid ? '' : getErrorMessage(min, max),
  };
}

export class ValidatedNumberInput extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { isValid, errorMessage } = isNumberValid(
      props.initialValue,
      this.props.min,
      this.props.max
    );

    this.state = {
      value: props.initialValue,
      errorMessage,
      isValid,
    };
  }

  _submit = _.debounce((value) => {
    this.props.onChange(value);
  }, 250);

  _onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
        display={this.props.display}
        helpText={this.props.helpText}
      >
        <EuiFieldNumber
          isInvalid={!this.state.isValid}
          min={this.props.min}
          max={this.props.max}
          value={this.state.value}
          onChange={this._onChange}
          aria-label={`${this.props.label} number input`}
        />
      </EuiFormRow>
    );
  }
}
