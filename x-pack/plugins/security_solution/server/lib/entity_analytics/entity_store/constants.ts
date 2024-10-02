/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import { DEFAULT_INDEX_PATTERN } from '../../../../common/constants';

/**
 * Default index pattern for entity store
 * This is the same as the default index pattern for the SIEM app but might diverge in the future
 */
export const ENTITY_STORE_DEFAULT_SOURCE_INDICES = DEFAULT_INDEX_PATTERN;

export const ENGINE_STATUS: Record<Uppercase<EngineStatus>, EngineStatus> = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
};

export const MAX_SEARCH_RESPONSE_SIZE = 10_000;
