/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValue, FormData } from 'formsy-react';
import { validateHosts } from './hosts';
import { validateInterval } from './interval';
import { validateNumeric } from './numeric';
import { validatePath } from './path';
import { validatePaths } from './paths';
import { validatePeriod } from './period';
import { validateString } from './string';
import { validateYaml } from './yaml';

export interface ValidationRule {
  id: string;
  validationFunction: ValidationFunc;
}

export type ValidationFunc = (values?: FormData, value?: FieldValue) => boolean;

export const validationRules: ValidationRule[] = [
  validateHosts,
  validateInterval,
  validateNumeric,
  validatePath,
  validatePaths,
  validatePeriod,
  validateString,
  validateYaml,
];
