/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from '../../../../common/api/entity_analytics';

export const DEFAULT_LOOKBACK_PERIOD = '24h';

export const DEFAULT_INTERVAL = '30s';

export const ENGINE_STATUS: Record<Uppercase<EngineStatus>, EngineStatus> = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
  UPDATING: 'updating',
  ERROR: 'error',
};

export const MAX_SEARCH_RESPONSE_SIZE = 10_000;
