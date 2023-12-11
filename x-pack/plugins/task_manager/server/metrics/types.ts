/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskLifecycleEvent } from '../polling_lifecycle';

export interface ITaskMetricsAggregator<T> {
  initialMetric: () => T;
  collect: () => T;
  reset: () => void;
  processTaskLifecycleEvent: (event: TaskLifecycleEvent) => void;
}
