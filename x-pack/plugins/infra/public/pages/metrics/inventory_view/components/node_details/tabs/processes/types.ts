/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsExplorerSeries } from '../../../../../../../../common/http_api';
import { STATE_NAMES } from './states';

export interface Process {
  command: string;
  cpu: number;
  memory: number;
  startTime: number;
  state: keyof typeof STATE_NAMES;
  pid: number;
  user: string;
  timeseries: {
    [x: string]: MetricsExplorerSeries;
  };
  apmTrace?: string; // Placeholder
}
