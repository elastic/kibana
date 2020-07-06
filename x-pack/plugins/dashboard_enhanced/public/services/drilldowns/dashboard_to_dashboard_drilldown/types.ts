/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ValueClickContext,
  RangeSelectContext,
  IEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';

export type ActionContext<T extends IEmbeddable = IEmbeddable> =
  | ValueClickContext<T>
  | RangeSelectContext<T>;

export interface Config {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
}
