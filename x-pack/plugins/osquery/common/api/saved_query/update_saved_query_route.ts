/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { timeoutOrUndefined } from '@kbn/osquery-io-ts-types';

export const updateSavedQueryRequestBodySchema = t.type({
  id: t.string,
  query: t.string,
  description: t.union([t.string, t.undefined]),
  interval: t.union([toNumberRt, t.undefined]),
  timeout: timeoutOrUndefined,
  snapshot: t.union([t.boolean, t.undefined]),
  removed: t.union([t.boolean, t.undefined]),
  platform: t.union([t.string, t.undefined]),
  version: t.union([t.string, t.undefined]),
  ecs_mapping: t.union([
    t.record(
      t.string,
      t.type({
        field: t.union([t.string, t.undefined]),
        value: t.union([t.string, t.array(t.string), t.undefined]),
      })
    ),
    t.undefined,
  ]),
});

export type UpdateSavedQueryRequestBodySchema = t.OutputOf<
  typeof updateSavedQueryRequestBodySchema
>;

export const updateSavedQueryRequestParamsSchema = t.type({
  id: t.string,
});

export type UpdateSavedQueryRequestParamsSchema = t.OutputOf<
  typeof updateSavedQueryRequestParamsSchema
>;
