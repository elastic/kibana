/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SearchTotalHits } from '@elastic/elasticsearch/api/types';
import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { buildActionsQuery } from '../../search_strategy/osquery/factory/actions/all/query.all_actions.dsl';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const findActionsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/action',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readLiveQueries`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;

      try {
        // @ts-expect-error update types
        const actionsResponse = await esClient.search(buildActionsQuery(request.query));

        return response.ok({
          body: {
            actions: actionsResponse.body.hits.hits,
            totalCount:
              (actionsResponse.body.hits.total as SearchTotalHits)?.value ||
              actionsResponse.body.hits.total,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
