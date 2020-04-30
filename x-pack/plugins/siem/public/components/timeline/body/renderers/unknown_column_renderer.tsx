/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEmptyTagValue } from '../../../empty_value';
import { ColumnRenderer } from './column_renderer';

export const unknownColumnRenderer: ColumnRenderer = {
  isInstance: () => true,
  renderColumn: () => getEmptyTagValue(),
};
