/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  indexPatternTitleSchema,
  IndexPatternTitleSchema,
} from '../../../common/api_schemas/common';
import {
  fieldHistogramsRequestSchema,
  FieldHistogramsRequestSchema,
} from '../../../common/api_schemas/field_histograms';
import { getHistogramsForFields } from '../../shared_imports';
import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { wrapError, wrapEsError } from './error_utils';

export function registerFieldHistogramsRoutes({ router, license }: RouteDependencies) {
  router.post<IndexPatternTitleSchema, undefined, FieldHistogramsRequestSchema>(
    {
      path: addBasePath('field_histograms/{indexPatternTitle}'),
      validate: {
        params: indexPatternTitleSchema,
        body: fieldHistogramsRequestSchema,
      },
    },
    license.guardApiRoute<IndexPatternTitleSchema, undefined, FieldHistogramsRequestSchema>(
      async (ctx, req, res) => {
        const { indexPatternTitle } = req.params;
        const { query, fields, samplerShardSize } = req.body;

        try {
          const resp = await getHistogramsForFields(
            ctx.core.elasticsearch.client,
            indexPatternTitle,
            query,
            fields,
            samplerShardSize
          );

          return res.ok({ body: resp });
        } catch (e) {
          return res.customError(wrapError(wrapEsError(e)));
        }
      }
    )
  );
}
