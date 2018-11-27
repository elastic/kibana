/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValue, FormData } from 'formsy-react';
import { validateInterval } from './interval';

export interface ValidationRule {
  id: string;
  validationFunction: ValidationFunc;
}

export type ValidationFunc = (values?: FormData, value?: FieldValue) => boolean;

export const validationRules: ValidationRule[] = [validateInterval];
