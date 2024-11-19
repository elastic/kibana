/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';

export interface AlertsFilterAttributes {
  query?: Record<string, unknown>;
  meta: Record<string, unknown>;
  $state?: {
    store: FilterStateStore;
  };
}

export interface AlertsFilterQueryAttributes {
  kql: string;
  filters: AlertsFilterAttributes[];
  dsl: string;
}
