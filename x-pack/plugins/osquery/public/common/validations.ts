/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FormData, ValidationFunc } from '../shared_imports';
import { fieldValidators } from '../shared_imports';

export const queryFieldValidation: ValidationFunc<FormData, string, string> =
  fieldValidators.emptyField(
    i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
      defaultMessage: 'Query is a required field',
    })
  );
