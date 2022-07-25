/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { ColumnRenderer } from './column_renderer';

export const unknownColumnRenderer: ColumnRenderer = {
  isInstance: () => true,
  renderColumn: () => getEmptyTagValue(),
};
