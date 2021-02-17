/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { CommonProps } from '@elastic/eui/src/components/common';
import { FormsyInputProps, withFormsy } from 'formsy-react';
import React, { Component, InputHTMLAttributes } from 'react';

interface ComponentProps
  extends FormsyInputProps,
    CommonProps,
    Omit<React.ComponentProps<typeof EuiFieldText>, 'onChange' | 'onBlur'> {
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

class FieldText extends Component<
  InputHTMLAttributes<HTMLInputElement> & ComponentProps,
  ComponentState
> {
  public static defaultProps = {
    passRequiredToField: true,
  };

  public state = { allowError: false };

  public componentDidMount() {
    const { defaultValue, setValue } = this.props;
    if (defaultValue) {
      setValue(defaultValue);
    }
  }

  public UNSAFE_componentWillReceiveProps(nextProps: ComponentProps) {
    if (nextProps.isFormSubmitted()) {
      this.showError();
    }
  }

  public handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    this.props.setValue(value);
    if (this.props.onChange) {
      this.props.onChange(e, e.currentTarget.value);
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
      name,
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
      placeholder,
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
        <EuiFieldText
          id={id}
          name={name}
          placeholder={placeholder}
          value={getValue() || ''}
          isInvalid={!disabled && error}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          fullWidth={fullWidth}
          disabled={disabled}
          required={required}
          className={className}
        />
      </EuiFormRow>
    );
  }
}

export const FormsyEuiFieldText = withFormsy(FieldText);
