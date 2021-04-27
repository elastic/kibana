/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc } from '../../shared_imports';
export { queryFieldValidation } from '../../common/validations';

const idPattern = /^[a-zA-Z0-9-_]+$/;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idFieldValidation: ValidationFunc<any, string, string> = ({ value }) => {
  if (!value) {
    return {
      message: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.emptyIdError', {
        defaultMessage: 'ID is required',
      }),
    };
  }
  const valueIsValid = idPattern.test(value);
  if (!valueIsValid) {
    return {
      message: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.invalidIdError', {
        defaultMessage: 'Characters must be alphanumeric, or -',
      }),
    };
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const intervalFieldValidation: ValidationFunc<any, string, number> = ({ value }) => {
  if (!value || value <= 0) {
    return {
      message: i18n.translate(
        'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.invalidIntervalField',
        {
          defaultMessage: 'A positive interval value is required',
        }
      ),
    };
  }
};
