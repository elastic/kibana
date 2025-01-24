/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { APMConfig } from '../..';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MlClient } from '../../lib/helpers/get_ml_client';

export interface IEnvOptions {
  mlClient?: MlClient;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName?: string;
  environment: string;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroupKuery?: string;
  kuery?: string;
}
