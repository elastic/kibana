/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewTitleSchema } from '../../api_schemas/common';
import { dataViewTitleSchema } from '../../api_schemas/common';
import type { FieldHistogramsRequestSchema } from '../../api_schemas/field_histograms';
import { fieldHistogramsRequestSchema } from '../../api_schemas/field_histograms';
import { addInternalBasePath } from '../../../../common/constants';
import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  router.versioned
    .post({
      path: addInternalBasePath('field_histograms/{dataViewTitle}'),
      access: 'internal',
    })
    .addVersion<DataViewTitleSchema, undefined, FieldHistogramsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: dataViewTitleSchema,
            body: fieldHistogramsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<DataViewTitleSchema, undefined, FieldHistogramsRequestSchema>(
          routeHandler
        )(ctx, request, response);
      }
    );
}
