/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ecsMapping, arrayQueries } from '@kbn/osquery-io-ts-types';

export const OsqueryParams = t.type({
  query: t.union([t.string, t.undefined]),
  ecs_mapping: t.union([ecsMapping, t.undefined]),
  queries: t.union([arrayQueries, t.undefined]),
  pack_id: t.union([t.string, t.undefined]),
  saved_query_id: t.union([t.string, t.undefined]),
});

export const OsqueryParamsCamelCase = t.type({
  query: t.union([t.string, t.undefined]),
  ecsMapping: t.union([ecsMapping, t.undefined]),
  queries: t.union([arrayQueries, t.undefined]),
  packId: t.union([t.string, t.undefined]),
  savedQueryId: t.union([t.string, t.undefined]),
});
