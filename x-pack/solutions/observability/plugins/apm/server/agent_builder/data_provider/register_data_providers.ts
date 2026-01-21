/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { getRollupIntervalForTimeRange } from '@kbn/apm-data-access-plugin/server/utils';
import { getErrorSampleDetails } from '../../routes/errors/get_error_groups/get_error_sample_details';
import { parseDatemath } from '../utils/time';
import { getApmServiceSummary } from '../helpers/get_apm_service_summary';
import { getApmDownstreamDependencies } from '../helpers/get_apm_downstream_dependencies';
import { getServicesItems } from '../../routes/services/get_services/get_services_items';
import { getApmErrors } from '../helpers/get_apm_errors';
import { ApmDocumentType } from '../../../common/document_type';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getExitSpanChangePoints, getServiceChangePoints } from '../helpers/get_change_points';
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
          serviceEnvironment: serviceEnvironment ? serviceEnvironment : ENVIRONMENT_ALL.value,
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

  observabilityAgentBuilder.registerDataProvider(
    'servicesItems',
    async ({ request, environment, kuery, start, end, searchQuery }) => {
      const { apmEventClient, randomSampler, mlClient, apmAlertsClient } =
        await buildApmToolResources({
          core,
          plugins,
          request,
          logger,
        });

      const startMs = parseDatemath(start);
      const endMs = parseDatemath(end);

      return getServicesItems({
        apmEventClient,
        apmAlertsClient,
        randomSampler,
        mlClient,
        logger,
        environment: environment ?? ENVIRONMENT_ALL.value,
        kuery: kuery ?? '',
        start: startMs,
        end: endMs,
        serviceGroup: null,
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: getRollupIntervalForTimeRange(startMs, endMs),
        useDurationSummary: true, // Note: This will not work for pre 8.7 data. See: https://github.com/elastic/kibana/issues/167578
        searchQuery,
      });
    }
  );
}
