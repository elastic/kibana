/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasApmData } from '../../lib/helpers/has_apm_data';

export async function hasHistoricalAgentData(apmEventClient: APMEventClient): Promise<boolean> {
  return hasApmData(apmEventClient, 'has_historical_agent_data');
}
