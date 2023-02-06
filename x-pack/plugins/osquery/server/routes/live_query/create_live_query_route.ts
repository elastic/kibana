/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import unified from 'unified';
import markdown from 'remark-parse';
import { some, filter } from 'lodash';
import deepEqual from 'fast-deep-equal';

import type { ECSMappingOrUndefined } from '@kbn/osquery-io-ts-types';
import { createLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createActionHandler } from '../../handlers';
import { parser as OsqueryParser } from './osquery_parser';

export const createLiveQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/api/osquery/live_queries',
      validate: {
        body: buildRouteValidation<
          typeof createLiveQueryRequestBodySchema,
          CreateLiveQueryRequestBodySchema
        >(createLiveQueryRequestBodySchema),
      },
    },
    async (context, request, response) => {
      const [coreStartServices] = await osqueryContext.getStartServices();
      const soClient = (await context.core).savedObjects.client;

      const {
        osquery: { writeLiveQueries, runSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      const isInvalid = !(
        writeLiveQueries ||
        (runSavedQueries && (request.body.saved_query_id || request.body.pack_id))
      );

      if (isInvalid) {
        if (request.body.alert_ids?.length) {
          try {
            const client = await osqueryContext.service
              .getRuleRegistryService()
              ?.getRacClientWithRequest(request);

            const alertData = await client?.get({ id: request.body.alert_ids[0] });

            if (alertData?.['kibana.alert.rule.note']) {
              const parsedAlertInvestigationGuide = unified()
                .use([[markdown, {}], OsqueryParser])
                .parse(alertData?.['kibana.alert.rule.note']);

              const osqueryQueries = filter(parsedAlertInvestigationGuide?.children as object, [
                'type',
                'osquery',
              ]);

              const requestQueryExistsInTheInvestigationGuide = some(
                osqueryQueries,
                (payload: {
                  configuration: { query: string; ecs_mapping: ECSMappingOrUndefined };
                }) =>
                  payload?.configuration?.query === request.body.query &&
                  deepEqual(payload?.configuration?.ecs_mapping, request.body.ecs_mapping)
              );

              if (!requestQueryExistsInTheInvestigationGuide) throw new Error();
            }
          } catch (error) {
            return response.forbidden();
          }
        } else {
          return response.forbidden();
        }
      }

      try {
        const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;
        const { response: osqueryAction } = await createActionHandler(
          osqueryContext,
          request.body,
          { soClient, metadata: { currentUser } }
        );

        return response.ok({
          body: { data: osqueryAction },
        });
      } catch (error) {
        // TODO validate for 400 (when agents are not found for selection)
        // return response.badRequest({ body: new Error('No agents found for selection') });

        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
