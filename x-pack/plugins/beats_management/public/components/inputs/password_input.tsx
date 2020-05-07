/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommonProps, EuiFieldPassword, EuiFieldPasswordProps, EuiFormRow } from '@elastic/eui';
import { FormsyInputProps, withFormsy } from 'formsy-react';
import React, { Component, InputHTMLAttributes } from 'react';

interface ComponentProps
  extends FormsyInputProps,
    CommonProps,
    Omit<EuiFieldPasswordProps, 'onChange' | 'onBlur'> {
  instantValidation?: boolean;
  label: string;
  errorText: string;
  fullWidth: boolean;
  helpText: React.ReactElement<any>;
  compressed: boolean;
  onChange?(e: React.ChangeEvent<HTMLInputElement>, value: any): void;
  onBlur?(e: React.ChangeEvent<HTMLInputElement>, value: any): void;
}

interface ComponentState {
  allowError: boolean;
}

class FieldPassword extends Component<
  InputHTMLAttributes<HTMLInputElement> & ComponentProps,
  ComponentState
> {
  constructor(props: any) {
    super(props);

    this.state = {
      allowError: false,
    };
  }

  public componentDidMount() {
    const { defaultValue, setValue } = this.props;
    if (defaultValue) {
      setValue(defaultValue);
    }
  }

  public handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    this.props.setValue(value);
    if (this.props.onChange) {
      this.props.onChange(e, value);
    }
    if (this.props.instantValidation) {
      this.showError();
    }
  };

  public handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.showError();
    if (this.props.onBlur) {
      this.props.onBlur(e, e.currentTarget.value);
    }
  };

  public showError = () => this.setState({ allowError: true });

  public render() {
    const {
      id,
      required,
      label,
      getValue,
      isValid,
      isPristine,
      getErrorMessage,
      fullWidth,
      className,
      disabled,
      helpText,
      onBlur,
    } = this.props;

    const { allowError } = this.state;
    const error = !isPristine() && !isValid() && allowError;

    return (
      <EuiFormRow
        id={id}
        label={label}
        helpText={helpText}
        isInvalid={!disabled && error}
        error={!disabled && error ? getErrorMessage() : []}
      >
        <EuiFieldPassword
          id={id}
          name={name}
          value={getValue() || ''}
          isInvalid={!disabled && error}
          onChange={this.handleChange}
          onBlur={onBlur}
          fullWidth={fullWidth}
          disabled={disabled}
          required={required}
          className={className}
        />
      </EuiFormRow>
    );
  }
}

export const FormsyEuiPasswordText = withFormsy(FieldPassword);
