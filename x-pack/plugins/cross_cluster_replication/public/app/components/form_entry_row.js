/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFieldText,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';

/**
 * State transitions: fields update
 */
export const updateFields = (newValues) => ({ fields }) => ({
  fields: {
    ...fields,
    ...newValues,
  },
});

export class FormEntryRow extends PureComponent {
  static propTypes = {
    title: PropTypes.node,
    description: PropTypes.node,
    label: PropTypes.node,
    helpText: PropTypes.node,
    type: PropTypes.string,
    onValueUpdate: PropTypes.func.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.object,
    ]),
    disabled: PropTypes.bool,
    areErrorsVisible: PropTypes.bool.isRequired,
  };

  onFieldChange = (value) => {
    const { field, onValueUpdate, type } = this.props;
    const isNumber = type === 'number';

    let valueParsed = value;

    if (isNumber) {
      valueParsed = !!value ? parseInt(value, 10) : value; // make sure we don't send NaN value
      valueParsed = valueParsed  && valueParsed < 0 ? 0 : valueParsed; // make sure we don't send negative value
    }

    onValueUpdate({ [field]: valueParsed });
  }

  renderField = (isInvalid) => {
    const { value, type, disabled, isLoading } = this.props;
    switch (type) {
      case 'number':
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
      title,
      label,
      description,
      helpText,
      areErrorsVisible,
    } = this.props;

    const hasError = !!error;
    const isInvalid = hasError && (error.alwaysVisible || areErrorsVisible);

    return (
      <EuiDescribedFormGroup
        title={title}
        description={description}
        fullWidth
        key={field}
      >
        <EuiFormRow
          label={label}
          helpText={helpText}
          error={(error && error.message) ? error.message : error}
          isInvalid={isInvalid}
          fullWidth
        >
          {this.renderField(isInvalid)}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
