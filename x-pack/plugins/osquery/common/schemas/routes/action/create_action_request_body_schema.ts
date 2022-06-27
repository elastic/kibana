/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  query,
  agentSelection,
  ecsMappingOrUndefined,
  savedQueryIdOrUndefined,
} from '../../common/schemas';

export const createActionRequestBodySchema = t.type({
  agentSelection,
  query,
  saved_query_id: savedQueryIdOrUndefined,
  ecs_mapping: ecsMappingOrUndefined,
});

export type CreateActionRequestBodySchema = t.OutputOf<typeof createActionRequestBodySchema>;
