/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { i18n } from '@kbn/i18n';

export type FormValidationError = 'EMPTY';

export const validateStringNotEmpty = (value: string): FormValidationError[] =>
  value === '' ? ['EMPTY'] : [];

// i18n.translate('xpack.infra.logsSettings.fieldEmptyErrorMessage', {
//   defaultMessage: 'The field must not be empty',
// }),
