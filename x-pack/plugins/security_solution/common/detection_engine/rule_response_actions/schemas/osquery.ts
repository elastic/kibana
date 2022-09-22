/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const OsqueryParams = t.intersection([
  t.type({
    id: t.string,
  }),
  t.partial({
    query: t.union([t.string, t.undefined]),
    ecs_mapping: t.record(t.string, t.record(t.string, t.any)),
    queries: t.array(
      t.intersection([
        t.type({
          id: t.string,
          query: t.string,
        }),
        t.partial({
          ecs_mapping: t.record(t.string, t.record(t.string, t.any)),
          platform: t.union([t.string, t.undefined]),
          interval: t.union([t.number, t.undefined]),
        }),
      ])
    ),
    packId: t.union([t.string, t.undefined]),
    savedQueryId: t.union([t.string, t.undefined]),
  }),
]);
