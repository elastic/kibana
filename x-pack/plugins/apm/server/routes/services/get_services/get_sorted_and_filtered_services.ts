/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { Environment } from '../../../../common/environment_rt';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { ServiceGroup } from '../../../../common/service_groups';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getHealthStatuses } from './get_health_statuses';
import { lookupServices } from '../../service_groups/lookup_services';

export async function getServiceNamesFromTermsEnum({
  apmEventClient,
  environment,
  maxNumberOfServices,
}: {
  apmEventClient: APMEventClient;
  environment: Environment;
  maxNumberOfServices: number;
}) {
  if (environment !== ENVIRONMENT_ALL.value) {
    return [];
  }
  const response = await apmEventClient.termsEnum(
    'get_services_from_terms_enum',
    {
      apm: {
        events: [
          ProcessorEvent.transaction,
          ProcessorEvent.span,
          ProcessorEvent.metric,
          ProcessorEvent.error,
        ],
      },
      size: maxNumberOfServices,
      field: SERVICE_NAME,
    }
  );

  return response.terms;
}

export async function getSortedAndFilteredServices({
  mlClient,
  apmEventClient,
  start,
  end,
  environment,
  logger,
  serviceGroup,
  maxNumberOfServices,
}: {
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: Environment;
  logger: Logger;
  serviceGroup: ServiceGroup | null;
  maxNumberOfServices: number;
}) {
  const [servicesWithHealthStatuses, selectedServices] = await Promise.all([
    getHealthStatuses({
      mlClient,
      start,
      end,
      environment,
    }).catch((error) => {
      logger.error(error);
      return [];
    }),
    serviceGroup
      ? getServiceNamesFromServiceGroup({
          apmEventClient,
          start,
          end,
          maxNumberOfServices,
          serviceGroup,
        })
      : getServiceNamesFromTermsEnum({
          apmEventClient,
          environment,
          maxNumberOfServices,
        }),
  ]);

  const services = joinByKey(
    [
      ...servicesWithHealthStatuses,
      ...selectedServices.map((serviceName) => ({ serviceName })),
    ],
    'serviceName'
  );

  return services;
}

async function getServiceNamesFromServiceGroup({
  apmEventClient,
  start,
  end,
  maxNumberOfServices,
  serviceGroup: { kuery },
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  maxNumberOfServices: number;
  serviceGroup: ServiceGroup;
}) {
  const services = await lookupServices({
    apmEventClient,
    kuery,
    start,
    end,
    maxNumberOfServices,
  });
  return services.map(({ serviceName }) => serviceName);
}
