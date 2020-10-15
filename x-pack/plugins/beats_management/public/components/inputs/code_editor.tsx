/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { CommonProps, EuiCodeEditor, EuiCodeEditorProps, EuiFormRow } from '@elastic/eui';
// @ts-ignore
import { FormsyInputProps, withFormsy } from 'formsy-react';
import React, { Component, InputHTMLAttributes } from 'react';

interface ComponentProps extends FormsyInputProps, CommonProps, EuiCodeEditorProps {
  instantValidation: boolean;
  label: string;
  isReadOnly: boolean;
  mode: 'javascript' | 'yaml';
  errorText: string;
  fullWidth: boolean;
  helpText: React.ReactElement<any>;
  compressed: boolean;
  onChange(value: string): void;
  onBlur(): void;
}

interface ComponentState {
  allowError: boolean;
}

class CodeEditor extends Component<
  InputHTMLAttributes<HTMLTextAreaElement> & ComponentProps,
  ComponentState
> {
  public static defaultProps = {
    passRequiredToField: true,
  };

  public state = { allowError: false };

  public componentDidMount() {
    const { defaultValue, setValue } = this.props;
    setValue(defaultValue || '');
  }

  public UNSAFE_componentWillReceiveProps(nextProps: ComponentProps) {
    if (nextProps.isFormSubmitted()) {
      this.showError();
    }
  }

  public handleChange = (value: string) => {
    this.props.setValue(value);
    if (this.props.onChange) {
      this.props.onChange(value);
    }
    if (this.props.instantValidation) {
      this.showError();
    }
  };

  public handleBlur = () => {
    this.showError();
    if (this.props.onBlur) {
      this.props.onBlur();
    }
  };

  public showError = () => this.setState({ allowError: true });

  public render() {
    const {
      id,
      label,
      isReadOnly,
      isValid,
      getValue,
      isPristine,
      getErrorMessage,
      mode,
      fullWidth,
      className,
      helpText,
    } = this.props;

    const { allowError } = this.state;
    const error = !isPristine() && !isValid() && allowError;

    return (
      <EuiFormRow
        id={id}
        label={label}
        helpText={helpText}
        isInvalid={error}
        error={error ? getErrorMessage() : []}
      >
        <EuiCodeEditor
          name={name}
          mode={mode}
          theme="github"
          value={getValue() || ''}
          isReadOnly={isReadOnly || false}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          width={fullWidth ? '100%' : undefined}
          className={className}
        />
      </EuiFormRow>
    );
  }
}

export const FormsyEuiCodeEditor = withFormsy(CodeEditor);
