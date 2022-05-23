/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskInstance } from '@kbn/task-manager-plugin/server';

export const findingsAggregationConfig: TaskInstance = {
  id: 'CSP_findings_aggregation',
  taskType: 'CSP_findings_aggregation',
  schedule: { interval: '5m' },
  state: {},
  params: {},
};
