/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc, fieldValidators } from '../../shared_imports';
export { queryFieldValidation } from '../../common/validations';

const idPattern = /^[a-zA-Z0-9-_]+$/;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idSchemaValidation: ValidationFunc<any, string, string> = ({ value }) => {
  const valueIsValid = idPattern.test(value);
  if (!valueIsValid) {
    return {
      message: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.invalidIdError', {
        defaultMessage: 'Characters must be alphanumeric, _, or -',
      }),
    };
  }
};

export const idFieldValidations = [
  fieldValidators.emptyField(
    i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.emptyIdError', {
      defaultMessage: 'ID is required',
    })
  ),
  idSchemaValidation,
];

export const intervalFieldValidation: ValidationFunc<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  string,
  number
> = fieldValidators.numberGreaterThanField({
  than: 0,
  message: i18n.translate(
    'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.invalidIntervalField',
    {
      defaultMessage: 'A positive interval value is required',
    }
  ),
});
