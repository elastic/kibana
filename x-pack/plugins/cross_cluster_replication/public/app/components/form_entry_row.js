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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiButtonIcon,
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
  const { type, context: { label } } = error;
  const message = i18nValidationErrorMessages[type](label);
  return { message };
};

export class FormEntryRow extends PureComponent {
  static propTypes = {
    onValueUpdate: PropTypes.func.isRequired,
    onErrorUpdate: PropTypes.func.isRequired,
    onRemoveRow: PropTypes.func.isRequired,
    defaultValue: PropTypes.string,
    field: PropTypes.string.isRequired,
    schema: PropTypes.object.isRequired,
    areErrorsVisible: PropTypes.bool.isRequired,
    validator: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      value: props.defaultValue || '',
      error: this.validateField('', false)
    };

    this.validateField = debounce(this.validateField.bind(this), 500);
  }

  onFieldChange = (value) => {
    const { field, onValueUpdate } = this.props;

    this.setState({ value });
    onValueUpdate({ [field]: value });

    // We don't add the error in the setState() call above
    // because the "validateField()" call is debounced
    this.validateField(value);
  }

  validateField = (value, updateState = true) => {
    const { field, validator, onErrorUpdate } = this.props;

    const error = parseError(validator.validate({ [field]: value }).error);
    onErrorUpdate({ [field]: error });

    if (updateState) {
      this.setState({ error });
    }

    return error;
  }

  render() {
    const { field, schema, areErrorsVisible, onRemoveRow } = this.props;
    const { value, error } = this.state;

    const hasError = !!error;
    const isInvalid = hasError && areErrorsVisible;

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h4>{schema.label}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="danger"
                onClick={() => onRemoveRow(field)}
                iconType="minusInCircle"
                aria-label="Remove setting"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        description={schema.description}
        fullWidth
        key={field}
      >
        <EuiFormRow
          label={schema.label}
          error={error && error.message}
          isInvalid={isInvalid}
          fullWidth
        >
          <EuiFieldText
            isInvalid={isInvalid}
            value={value}
            onChange={e => this.onFieldChange(e.target.value)}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
