/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostTransformsPreviewRequestSchema } from '../../../common/api_schemas/transforms';

import { PivotQuery } from './request';

export const INIT_MAX_COLUMNS = 20;

export const getPivotPreviewDevConsoleStatement = (request: PostTransformsPreviewRequestSchema) => {
  return `POST _transform/_preview\n${JSON.stringify(request, null, 2)}\n`;
};

export const getIndexDevConsoleStatement = (query: PivotQuery, dataViewTitle: string) => {
  return `GET ${dataViewTitle}/_search\n${JSON.stringify(
    {
      query,
    },
    null,
    2
  )}\n`;
};
