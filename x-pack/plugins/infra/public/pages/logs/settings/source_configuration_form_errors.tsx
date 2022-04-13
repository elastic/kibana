/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FormValidationError } from './validation_errors';

export const LogSourceConfigurationFormErrors: React.FC<{ errors: FormValidationError[] }> = ({
  errors,
}) => (
  <EuiCallOut color="danger" iconType="alert" title={logSourceConfigurationFormErrorsCalloutTitle}>
    <ul>
      {errors.map((error, errorIndex) => (
        <li key={errorIndex}>
          <LogSourceConfigurationFormError error={error} />
        </li>
      ))}
    </ul>
  </EuiCallOut>
);

export const LogSourceConfigurationFormError: React.FC<{ error: FormValidationError }> = ({
  error,
}) => {
  if (error.type === 'generic') {
    return <>{error.message}</>;
  } else if (error.type === 'empty_field') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.emptyFieldErrorMessage"
        defaultMessage="The field '{fieldName}' must not be empty."
        values={{
          fieldName: error.fieldName,
        }}
      />
    );
  } else if (error.type === 'empty_column_list') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.emptyColumnListErrorMessage"
        defaultMessage="The column list must not be empty."
      />
    );
  } else if (error.type === 'child') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.childFormElementErrorMessage"
        defaultMessage="At least one form field is in an invalid state."
      />
    );
  } else if (error.type === 'missing_timestamp_field') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.missingTimestampFieldErrorMessage"
        defaultMessage="The data view must be time-based."
      />
    );
  } else if (error.type === 'missing_message_field') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.missingMessageFieldErrorMessage"
        defaultMessage="The data view must contain a {messageField} field."
        values={{
          messageField: <EuiCode>message</EuiCode>,
        }}
      />
    );
  } else if (error.type === 'invalid_message_field_type') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.invalidMessageFieldTypeErrorMessage"
        defaultMessage="The {messageField} field must be a text field."
        values={{
          messageField: <EuiCode>message</EuiCode>,
        }}
      />
    );
  } else if (error.type === 'rollup_index_pattern') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.rollupIndexPatternErrorMessage"
        defaultMessage="The data view must not be a rollup index pattern."
      />
    );
  } else if (error.type === 'missing_index_pattern') {
    return (
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.missingDataViewErrorMessage"
        defaultMessage="The data view {dataViewId} must exist."
        values={{
          dataViewId: <EuiCode>{error.indexPatternId}</EuiCode>,
        }}
      />
    );
  } else {
    return null;
  }
};

const logSourceConfigurationFormErrorsCalloutTitle = i18n.translate(
  'xpack.infra.logSourceConfiguration.logSourceConfigurationFormErrorsCalloutTitle',
  {
    defaultMessage: 'Inconsistent source configuration',
  }
);
