/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewTitleSchema, DataViewTitleSchema } from '../../../common/api_schemas/common';
import {
  fieldHistogramsRequestSchema,
  FieldHistogramsRequestSchema,
} from '../../../common/api_schemas/field_histograms';
import { getHistogramsForFields } from '../../shared_imports';
import { RouteDependencies } from '../../types';

import { addBasePath } from '..';

import { wrapError, wrapEsError } from './error_utils';

export function registerFieldHistogramsRoutes({ router, license }: RouteDependencies) {
  router.post<DataViewTitleSchema, undefined, FieldHistogramsRequestSchema>(
    {
      path: addBasePath('field_histograms/{dataViewTitle}'),
      validate: {
        params: dataViewTitleSchema,
        body: fieldHistogramsRequestSchema,
      },
    },
    license.guardApiRoute<DataViewTitleSchema, undefined, FieldHistogramsRequestSchema>(
      async (ctx, req, res) => {
        const { dataViewTitle } = req.params;
        const { query, fields, runtimeMappings, samplerShardSize } = req.body;

        try {
          const esClient = (await ctx.core).elasticsearch.client;
          const resp = await getHistogramsForFields(
            esClient,
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
      }
    )
  );
}
