/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { i18n } from '@kbn/i18n';
import type { FunctionRegistrationParameters } from '.';
import { getApmAlertsClient } from '../lib/helpers/get_apm_alerts_client';
import { getMlClient } from '../lib/helpers/get_ml_client';
import { getApmServiceSummary } from '../routes/assistant_functions/get_apm_service_summary';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

export function registerGetApmServiceSummaryFunction({
  resources,
  apmEventClient,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_apm_service_summary',
      contexts: ['apm'],
      description: `Gets a summary of a single service, including: the language, service version, 
deployments, the environments, and the infrastructure that it is running in, for instance on how 
many pods, and a list of its downstream dependencies. It also returns active 
alerts and anomalies.`,
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmServiceSummary.descriptionForUser',
        {
          defaultMessage: `Gets a summary of a single service, including: the language, service version, 
deployments, the environments, and the infrastructure that it is running in, for instance on how 
many pods, and a list of its downstream dependencies. It also returns active 
alerts and anomalies.`,
        }
      ),
      parameters: {
        type: 'object',
        properties: {
          'service.name': {
            ...NON_EMPTY_STRING,
            description: 'The name of the service that should be summarized.',
          },
          'service.environment': {
            ...NON_EMPTY_STRING,
            description: 'The environment that the service is running in',
          },
          start: {
            ...NON_EMPTY_STRING,
            description:
              'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            ...NON_EMPTY_STRING,
            description:
              'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
        },
        required: ['service.name', 'start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      const { context, request, plugins, logger } = resources;

      const [annotationsClient, esClient, apmAlertsClient, mlClient] =
        await Promise.all([
          plugins.observability.setup.getScopedAnnotationsClient(
            context,
            request
          ),
          context.core.then(
            (coreContext): ElasticsearchClient =>
              coreContext.elasticsearch.client.asCurrentUser
          ),
          getApmAlertsClient(resources),
          getMlClient(resources),
        ]);

      return {
        content: await getApmServiceSummary({
          apmEventClient,
          annotationsClient,
          esClient,
          apmAlertsClient,
          mlClient,
          logger,
          arguments: args,
        }),
      };
    }
  );
}
