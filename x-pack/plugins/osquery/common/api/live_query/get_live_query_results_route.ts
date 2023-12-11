/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { Direction } from '../../search_strategy';

export const getLiveQueryResultsRequestQuerySchema = t.type({
  kuery: t.union([t.string, t.undefined]),
  page: t.union([toNumberRt, t.undefined]),
  pageSize: t.union([toNumberRt, t.undefined]),
  sort: t.union([t.string, t.undefined]),
  sortOrder: t.union([t.literal(Direction.asc), t.literal(Direction.desc), t.undefined]),
});

export type GetLiveQueryResultsRequestQuerySchema = t.OutputOf<
  typeof getLiveQueryResultsRequestQuerySchema
>;

export const getLiveQueryResultsRequestParamsSchema = t.type({
  id: t.string,
  actionId: t.string,
});

export type GetLiveQueryResultsRequestParamsSchema = t.OutputOf<
  typeof getLiveQueryResultsRequestParamsSchema
>;
