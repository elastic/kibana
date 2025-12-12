/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { getErrorSampleDetails } from '../../routes/errors/get_error_groups/get_error_sample_details';
import { parseDatemath } from '../utils/time';
import { getApmServiceSummary } from '../../routes/assistant_functions/get_apm_service_summary';
import { getApmDownstreamDependencies } from '../../routes/assistant_functions/get_apm_downstream_dependencies';
import { getApmErrors } from '../../routes/assistant_functions/get_observability_alert_details_context/get_apm_errors';
import {
  getExitSpanChangePoints,
  getServiceChangePoints,
} from '../../routes/assistant_functions/get_changepoints';
import { buildApmToolResources } from '../utils/build_apm_tool_resources';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';

export function registerDataProviders({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'apmServiceSummary',
    async ({ request, serviceName, serviceEnvironment, start, end, transactionType }) => {
      const { apmEventClient, apmAlertsClient, mlClient, esClient } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });

      return getApmServiceSummary({
        apmEventClient,
        esClient: esClient.asCurrentUser,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: {
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          start,
          end,
          'transaction.type': transactionType,
        },
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmDownstreamDependencies',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient, randomSampler } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });

      return getApmDownstreamDependencies({
        apmEventClient,
        randomSampler,
        arguments: {
          serviceName,
          serviceEnvironment,
          start,
          end,
        },
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmErrors',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });
      return getApmErrors({ apmEventClient, serviceName, serviceEnvironment, start, end });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmExitSpanChangePoints',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getExitSpanChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        start,
        end,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmServiceChangePoints',
    async ({
      request,
      serviceName,
      serviceEnvironment,
      transactionType,
      transactionName,
      start,
      end,
    }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getServiceChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        transactionType,
        transactionName,
        start,
        end,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmErrorDetails',
    async ({ request, errorId, serviceName, serviceEnvironment, start, end, kuery = '' }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getErrorSampleDetails({
        apmEventClient,
        errorId,
        serviceName,
        start: parseDatemath(start),
        end: parseDatemath(end),
        environment: serviceEnvironment ?? '',
        kuery,
      });
    }
  );
}
