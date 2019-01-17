/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';

import {
  EuiTitle,
  EuiFieldText,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';

import { i18nValidationErrorMessages } from '../services/input_validation';

/**
 * State transitions: fields update
 */
export const updateFields = (newValues) => ({ fields }) => ({
  fields: {
    ...fields,
    ...newValues,
  },
});

const parseError = (err) => {
  if (!err) {
    return null;
  }

  const [error] = err.details; // Use the first error in the details array (error.details[0])
  const { type, context } = error;
  const message = i18nValidationErrorMessages[type](context);
  return { message };
};

export class FormEntryRow extends PureComponent {
  static propTypes = {
    label: PropTypes.node,
    description: PropTypes.node,
    helpText: PropTypes.node,
    validator: PropTypes.object,
    onValueUpdate: PropTypes.func.isRequired,
    onErrorUpdate: PropTypes.func.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.object,
    disabled: PropTypes.bool,
    areErrorsVisible: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    this.validateField(this.props.value);
    this.validateField = debounce(this.validateField.bind(this), 300);
  }

  onFieldChange = (value) => {
    const { field, onValueUpdate, validator } = this.props;
    const isNumber = validator._type === 'number';
    onValueUpdate({ [field]: isNumber ? parseInt(value, 10) : value });

    this.validateField(value);
  }

  validateField = (value) => {
    const { field, validator, label, onErrorUpdate } = this.props;
    const result = validator.label(label).validate(value);
    const error = parseError(result.error);

    onErrorUpdate({ [field]: error });
  }

  renderField = (isInvalid) => {
    const { value, validator, disabled, isLoading } = this.props;
    switch (validator._type) {
      case "number":
        return (
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={value}
            onChange={e => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
          />
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={value}
            onChange={e => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
          />
        );
    }
  }

  render() {
    const {
      field,
      error,
      label,
      description,
      helpText,
      areErrorsVisible,
    } = this.props;

    const hasError = !!error;
    const isInvalid = hasError && (error.alwaysVisible || areErrorsVisible);

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>{label}</h4>
          </EuiTitle>
        )}
        description={description}
        fullWidth
        key={field}
      >
        <EuiFormRow
          label={label}
          helpText={helpText}
          error={error && error.message}
          isInvalid={isInvalid}
          fullWidth
        >
          {this.renderField(isInvalid)}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
