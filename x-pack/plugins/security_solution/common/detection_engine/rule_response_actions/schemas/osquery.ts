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
    ecs_mapping: t.record(
      t.string,
      t.partial({
        field: t.string,
        value: t.union([t.string, t.array(t.string)]),
      })
    ),
    queries: t.array(
      t.type({
        id: t.string,
        query: t.string,
        version: t.union([t.string, t.undefined]),
        platform: t.union([t.string, t.undefined]),
        interval: t.union([t.number, t.undefined]),
        ecs_mapping: t.record(
          t.string,
          t.partial({
            field: t.string,
            value: t.union([t.string, t.array(t.string)]),
          })
        ),
      })
    ),
    packId: t.union([t.string, t.undefined]),
    savedQueryId: t.union([t.string, t.undefined]),
  }),
]);
