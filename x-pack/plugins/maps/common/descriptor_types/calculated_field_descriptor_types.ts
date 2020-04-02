/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { SourceField } from './descriptor_types';

export type Variable = {
  sourceField: SourceField;
  variableName: string;
};

export type CalculatedFieldDescriptor = {
  variables: Variable[];
  expression: string;
};
