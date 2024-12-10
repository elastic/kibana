/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCCSRemoteIndexName } from '@kbn/es-query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getApmIndicesCombined } from './indices_stats_helpers';

export function isCrossClusterSearch(apmEventClient: APMEventClient) {
  // Check if a remote cluster is set in APM indices
  const index = getApmIndicesCombined(apmEventClient);
  return isCCSRemoteIndexName(index);
}
