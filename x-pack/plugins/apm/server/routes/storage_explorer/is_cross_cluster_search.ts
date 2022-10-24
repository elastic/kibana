/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../lib/helpers/setup_request';
import { getApmIndicesCombined } from './indices_stats_helpers';

export function isCrossClusterSearch(setup: Setup) {
  // Check if a remote cluster is set in APM indices
  return getApmIndicesCombined(setup).includes(':');
}
