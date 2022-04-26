/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { Environment } from '../../../../common/environment_rt';
import { ProcessorEvent } from '../../../../common/processor_event';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { ServiceGroup } from '../../../../common/service_groups';
import { Setup } from '../../../lib/helpers/setup_request';
import { getHealthStatuses } from './get_health_statuses';

export async function getSortedAndFilteredServices({
  setup,
  start,
  end,
  environment,
  logger,
  serviceGroup,
}: {
  setup: Setup;
  start: number;
  end: number;
  environment: Environment;
  logger: Logger;
  serviceGroup: ServiceGroup | null;
}) {
  const { apmEventClient } = setup;

  async function getServiceNamesFromTermsEnum() {
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
        body: {
          size: 500,
          field: SERVICE_NAME,
        },
      }
    );

    return response.terms;
  }

  const [servicesWithHealthStatuses, selectedServices] = await Promise.all([
    getHealthStatuses({
      setup,
      start,
      end,
      environment,
    }).catch((error) => {
      logger.error(error);
      return [];
    }),
    serviceGroup
      ? getServiceNamesFromServiceGroup(serviceGroup)
      : getServiceNamesFromTermsEnum(),
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

async function getServiceNamesFromServiceGroup(serviceGroup: ServiceGroup) {
  return serviceGroup.serviceNames;
}
