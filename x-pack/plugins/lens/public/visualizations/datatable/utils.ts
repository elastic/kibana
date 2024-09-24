/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnState } from '../../../common/expressions';

export function getColumnAlignment(
  alignment: ColumnState['alignment'],
  isNumeric = false
): 'left' | 'right' | 'center' {
  if (alignment) return alignment;
  return (isNumeric ? 'right' : 'left') ?? 'right';
}
