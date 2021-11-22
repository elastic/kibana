/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionBasedPrivateState } from './types';

export function fieldExists(
  existingFields: ExpressionBasedPrivateState['existingFields'],
  indexPatternTitle: string,
  fieldName: string
) {
  return existingFields[indexPatternTitle] && existingFields[indexPatternTitle][fieldName];
}
