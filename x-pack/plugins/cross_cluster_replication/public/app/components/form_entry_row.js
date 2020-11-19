/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
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
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.node, PropTypes.object]),
    disabled: PropTypes.bool,
    areErrorsVisible: PropTypes.bool.isRequired,
    testSubj: PropTypes.string,
  };

  onFieldChange = (value) => {
    const { field, onValueUpdate, type } = this.props;
    const isNumber = type === 'number';

    let valueParsed = value;

    if (isNumber) {
      valueParsed = !!value ? Math.max(0, parseInt(value, 10)) : value; // make sure we don't send NaN value or a negative number
    }

    onValueUpdate({ [field]: valueParsed });
  };

  renderField = (isInvalid) => {
    const { value, type, disabled, isLoading, testSubj } = this.props;
    switch (type) {
      case 'number':
        return (
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={value}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
            data-test-subj={testSubj}
          />
        );
      default:
        return (
          <EuiFieldText
            isInvalid={isInvalid}
            value={value}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled === true}
            isLoading={isLoading}
            fullWidth
            data-test-subj={testSubj}
          />
        );
    }
  };

  render() {
    const {
      field,
      error,
      title,
      label,
      description,
      helpText,
      areErrorsVisible,
      value,
      defaultValue,
    } = this.props;

    const hasError = !!error;
    const isInvalid = hasError && (error.alwaysVisible || areErrorsVisible);
    const canBeResetToDefault = defaultValue !== undefined;
    const isResetToDefaultVisible = value !== defaultValue;

    const fieldHelpText = (
      <Fragment>
        {helpText}

        {canBeResetToDefault && isResetToDefaultVisible && (
          <p>
            <EuiLink onClick={() => this.onFieldChange(defaultValue)}>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.resetFieldButtonLabel"
                defaultMessage="Reset to default"
              />
            </EuiLink>
          </p>
        )}
      </Fragment>
    );

    return (
      <EuiDescribedFormGroup title={title} description={description} fullWidth key={field}>
        <EuiFormRow
          label={label}
          helpText={fieldHelpText}
          error={error && error.message ? error.message : error}
          isInvalid={isInvalid}
          fullWidth
        >
          {this.renderField(isInvalid)}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
}
