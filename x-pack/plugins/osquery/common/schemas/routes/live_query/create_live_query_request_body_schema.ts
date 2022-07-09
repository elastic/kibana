/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  agentSelection,
  ecsMappingOrUndefined,
  savedQueryIdOrUndefined,
  packIdOrUndefined,
  queryOrUndefined,
  executionContextOrUndefined,
} from '../../common/schemas';

export const createLiveQueryRequestBodySchema = t.type({
  agentSelection,
  query: queryOrUndefined,
  saved_query_id: savedQueryIdOrUndefined,
  ecs_mapping: ecsMappingOrUndefined,
  pack_id: packIdOrUndefined,
  execution_context: executionContextOrUndefined,
});

export type CreateLiveQueryRequestBodySchema = t.OutputOf<typeof createLiveQueryRequestBodySchema>;
