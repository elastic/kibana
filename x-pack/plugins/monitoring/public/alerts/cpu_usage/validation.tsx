/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { i18n } from '@kbn/i18n';
// import { isNumber } from 'lodash';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../triggers_actions_ui/public/types';

export function validate({ criteria }: { criteria: any[] }): ValidationResult {
  const validationResult = { errors: {} };
  return validationResult;
}
