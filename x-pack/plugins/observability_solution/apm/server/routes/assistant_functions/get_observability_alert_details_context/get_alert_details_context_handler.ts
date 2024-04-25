/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  AlertDetailsContextualInsightsHandlerQuery,
  AlertDetailsContextualInsightsRequestContext,
} from '@kbn/observability-plugin/server/services';
import { getApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getObservabilityAlertDetailsContext } from '.';
import { APMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';

export const getAlertDetailsContextHandler = (
  resourcePlugins: APMRouteHandlerResources['plugins'],
  logger: Logger
) => {
  return async (
    requestContext: AlertDetailsContextualInsightsRequestContext,
    query: AlertDetailsContextualInsightsHandlerQuery
  ) => {
    const resources = {
      getApmIndices: async () => {
        const coreContext = await requestContext.core;
        return resourcePlugins.apmDataAccess.setup.getApmIndices(coreContext.savedObjects.client);
      },
      request: requestContext.request,
      params: { query: { _inspect: false } },
      plugins: resourcePlugins,
      context: {
        core: requestContext.core,
        licensing: requestContext.licensing,
        alerting: resourcePlugins.alerting!.start().then((startContract) => {
          return {
            getRulesClient() {
              return startContract.getRulesClientWithRequest(requestContext.request);
            },
          };
        }),
        rac: resourcePlugins.ruleRegistry.start().then((startContract) => {
          return {
            getAlertsClient() {
              return startContract.getRacClientWithRequest(requestContext.request);
            },
          };
        }),
      },
    };

    const [apmEventClient, annotationsClient, apmAlertsClient, coreContext, mlClient] =
      await Promise.all([
        getApmEventClient(resources),
        resourcePlugins.observability.setup.getScopedAnnotationsClient(
          resources.context,
          requestContext.request
        ),
        getApmAlertsClient(resources),
        requestContext.core,
        getMlClient(resources),
        getRandomSampler({
          security: resourcePlugins.security,
          probability: 1,
          request: requestContext.request,
        }),
      ]);
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return getObservabilityAlertDetailsContext({
      coreContext,
      apmEventClient,
      annotationsClient,
      apmAlertsClient,
      mlClient,
      esClient,
      query,
      logger,
    });
  };
};
