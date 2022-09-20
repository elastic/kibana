/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const ecsMapping = t.record(
  t.string,
  t.partial({
    field: t.string,
    value: t.union([t.string, t.array(t.string)]),
  })
);

export const arrayQueries = t.array(
  t.type({
    id: t.string,
    query: t.string,
    ecs_mapping: ecsMapping,
    version: t.union([t.string, t.undefined]),
    platform: t.union([t.string, t.undefined]),
  })
);

export const OsqueryParams = t.intersection([
  t.type({
    id: t.string,
  }),
  t.partial({
    query: t.union([t.string, t.undefined]),
    ecs_mapping: ecsMapping,
    queries: arrayQueries,
    packId: t.union([t.string, t.undefined]),
    savedQueryId: t.union([t.string, t.undefined]),
  }),
]);
