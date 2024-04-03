/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';

import type { DataViewTitleSchema } from '../../../../common/api_schemas/common';
import type { FieldHistogramsRequestSchema } from '../../../../common/api_schemas/field_histograms';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  DataViewTitleSchema,
  undefined,
  FieldHistogramsRequestSchema
> = async (ctx, req, res) => {
  const { dataViewTitle } = req.params;
  const { query, fields, runtimeMappings, samplerShardSize } = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const resp = await fetchHistogramsForFields(
      esClient.asCurrentUser,
      dataViewTitle,
      query,
      fields,
      samplerShardSize,
      runtimeMappings
    );

    return res.ok({ body: resp });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
