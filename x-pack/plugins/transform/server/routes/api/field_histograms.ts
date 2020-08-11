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

import { wrapEsError } from '../../../../../legacy/server/lib/create_router/error_wrappers';

import { getHistogramsForFields } from '../../shared_imports';
import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { wrapError } from './error_utils';
import { fieldHistogramsSchema, indexPatternTitleSchema, IndexPatternTitleSchema } from './schema';

export function registerFieldHistogramsRoutes({ router, license }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('field_histograms/{indexPatternTitle}'),
      validate: {
        params: indexPatternTitleSchema,
        body: fieldHistogramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { indexPatternTitle } = req.params as IndexPatternTitleSchema;
      const { query, fields, samplerShardSize } = req.body;

      try {
        const resp = await getHistogramsForFields(
          ctx.transform!.dataClient,
          indexPatternTitle,
          query,
          fields,
          samplerShardSize
        );

        return res.ok({ body: resp });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}
