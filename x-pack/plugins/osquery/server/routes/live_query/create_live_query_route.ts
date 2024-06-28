/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import { some, filter } from 'lodash';
import deepEqual from 'fast-deep-equal';
import type { ECSMappingOrUndefined } from '@kbn/osquery-io-ts-types';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { createLiveQueryRequestBodySchema } from '../../../common/api';
import { API_VERSIONS } from '../../../common/constants';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createActionHandler } from '../../handlers';
import { parser as OsqueryParser } from './osquery_parser';

export const createLiveQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/live_queries',
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidation<
              typeof createLiveQueryRequestBodySchema,
              CreateLiveQueryRequestBodySchema
            >(createLiveQueryRequestBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const [coreStartServices] = await osqueryContext.getStartServices();
        const coreContext = await context.core;
        const soClient = coreContext.savedObjects.client;

        const {
          osquery: { writeLiveQueries, runSavedQueries },
        } = await coreStartServices.capabilities.resolveCapabilities(request, {
          capabilityPath: 'osquery.*',
        });

        const isInvalid = !(
          writeLiveQueries ||
          (runSavedQueries && (request.body.saved_query_id || request.body.pack_id))
        );

        const client = await osqueryContext.service
          .getRuleRegistryService()
          ?.getRacClientWithRequest(request);

        const alertData = request.body.alert_ids?.length
          ? ((await client?.get({ id: request.body.alert_ids[0] })) as ParsedTechnicalFields & {
              _index: string;
            })
          : undefined;

        if (isInvalid) {
          if (request.body.alert_ids?.length) {
            try {
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
                  }) => {
                    const { result: replacedConfigurationQuery } = replaceParamsQuery(
                      payload.configuration.query,
                      alertData
                    );

                    return (
                      replacedConfigurationQuery === request.body.query &&
                      deepEqual(payload.configuration.ecs_mapping, request.body.ecs_mapping)
                    );
                  }
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
          const currentUser = coreContext.security.authc.getCurrentUser()?.username;
          const { response: osqueryAction, fleetActionsCount } = await createActionHandler(
            osqueryContext,
            request.body,
            {
              soClient,
              metadata: { currentUser },
              alertData,
            }
          );
          if (!fleetActionsCount) {
            return response.badRequest({
              body: PARAMETER_NOT_FOUND,
            });
          }

          return response.ok({
            body: { data: osqueryAction },
          });
        } catch (error) {
          if (error.statusCode === 400) {
            return response.badRequest({ body: error });
          }

          return response.customError({
            statusCode: 500,
            body: new Error(`Error occurred while processing ${error}`),
          });
        }
      }
    );
};
