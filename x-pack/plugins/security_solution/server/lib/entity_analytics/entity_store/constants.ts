/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from '../../../../common/api/entity_analytics/entity_store/common.gen';

/**
 * Default index pattern for entity store
 * This is the same as the default index pattern for the SIEM app but might diverge in the future
 */

export const DEFAULT_LOOKBACK_PERIOD = '24h';

export const DEFAULT_INTERVAL = '15s';

export const ENGINE_STATUS: Record<Uppercase<EngineStatus>, EngineStatus> = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
  UPDATING: 'updating',
};

export const MAX_SEARCH_RESPONSE_SIZE = 10_000;
