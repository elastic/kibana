/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';

import { verifyAccessAndContext } from '../lib';
import { ILicenseState } from '../../lib';
import { AlertingRequestHandlerContext } from '../../types';

export function registerFieldsRoute(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) {
  router.post(
    {
      path: '/internal/rules/suggestions/fields',
      validate: {
        body: schema.object({
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, request, response) {
        // TODO Add validation to make sure all fields start with 'alert.'
        const { fields: requestedFields = ['alert.*'] } = request.body;
        const indices = [ALERTING_CASES_SAVED_OBJECT_INDEX];
        const { elasticsearch } = await context.core;

        const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(
          elasticsearch.client.asInternalUser
        );
        const { fields } = await indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
          pattern: indices,
          fields: Array.isArray(requestedFields) ? requestedFields : [requestedFields],
          fieldCapsOptions: { allow_no_indices: true },
        });
        return response.ok({ body: fields });
      })
    )
  );
}
