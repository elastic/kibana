/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery, Filter } from '@kbn/es-query';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
export interface AlertStatusFilter {
  status: AlertStatus;
  query?: Filter['query'];
  label: string;
}

export interface AlertsEsQuery {
  bool: BoolQuery;
}
