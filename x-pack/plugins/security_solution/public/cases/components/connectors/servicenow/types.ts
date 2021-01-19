/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelectOption } from '@elastic/eui';

export interface Choice {
  value: string;
  label: string;
  dependent_value: string;
  element: string;
}

export type Fields = Record<string, Choice[]>;
export type Options = Record<string, EuiSelectOption[]>;
