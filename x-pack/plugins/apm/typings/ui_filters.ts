/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UxLocalUIFilterName } from '../common/ux_ui_filter';

export type UxUIFilters = {
  environment?: string;
} & {
  [key in UxLocalUIFilterName]?: string[];
};

export interface BreakdownItem {
  name: string;
  type: string;
  fieldName: string;
  selected?: boolean;
}
