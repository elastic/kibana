/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Environment } from '../../../common/environment_rt';
import { APMEventClient } from '../helpers/create_es_client/create_apm_event_client';

export type TraceMetricFetcher<T> = (options: {
  prev?: T;
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  environment: Environment;
}) => Promise<T>;
