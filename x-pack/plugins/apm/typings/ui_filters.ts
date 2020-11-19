/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LocalUIFilterName } from '../common/ui_filter';

export type UIFilters = {
  kuery?: string;
  environment?: string;
} & { [key in LocalUIFilterName]?: string[] };

export interface BreakdownItem {
  name: string;
  type: string;
  fieldName: string;
  selected?: boolean;
}
