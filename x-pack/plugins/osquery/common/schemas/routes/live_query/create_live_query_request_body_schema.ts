/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  ecsMappingOrUndefined,
  savedQueryIdOrUndefined,
  packIdOrUndefined,
  queryOrUndefined,
  queriesOrUndefined,
  stringArrayOrUndefined,
} from '../../common/schemas';

export const createLiveQueryRequestBodySchema = t.type({
  agent_ids: stringArrayOrUndefined,
  agent_all: t.union([t.boolean, t.undefined]),
  agent_platforms: stringArrayOrUndefined,
  agent_policy_ids: stringArrayOrUndefined,
  query: queryOrUndefined,
  queries: queriesOrUndefined,
  saved_query_id: savedQueryIdOrUndefined,
  ecs_mapping: ecsMappingOrUndefined,
  pack_id: packIdOrUndefined,
  alert_ids: stringArrayOrUndefined,
  case_ids: stringArrayOrUndefined,
  event_ids: stringArrayOrUndefined,
  metadata: t.union([t.object, t.undefined]),
});

export type CreateLiveQueryRequestBodySchema = t.OutputOf<typeof createLiveQueryRequestBodySchema>;
