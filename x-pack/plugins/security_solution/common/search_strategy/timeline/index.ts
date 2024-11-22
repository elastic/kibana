/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortField } from '../common';

export * from './events';

export interface TimelineRequestSortField<Field = string> extends SortField<Field> {
  type: string;
  esTypes: string[];
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}
