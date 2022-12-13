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
  arrayQueries,
} from '@kbn/osquery-io-ts-types';

export const createLiveQueryRequestBodySchema = t.partial({
  agent_ids: t.array(t.string),
  agent_all: t.union([t.boolean, t.undefined]),
  agent_platforms: t.array(t.string),
  agent_policy_ids: t.array(t.string),
  query: queryOrUndefined,
  queries: arrayQueries,
  saved_query_id: savedQueryIdOrUndefined,
  ecs_mapping: ecsMappingOrUndefined,
  pack_id: packIdOrUndefined,
  alert_ids: t.array(t.string),
  case_ids: t.array(t.string),
  event_ids: t.array(t.string),
  metadata: t.union([t.object, t.undefined]),
});

export type CreateLiveQueryRequestBodySchema = t.OutputOf<typeof createLiveQueryRequestBodySchema>;
