/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc, fieldValidators } from '../shared_imports';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryFieldValidation: ValidationFunc<any, string, string> = fieldValidators.emptyField(
  i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
    defaultMessage: 'Query is a required field',
  })
);
