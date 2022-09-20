/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { arrayQueries, ecsMapping } from '@kbn/osquery-plugin/common/schemas/common';

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
