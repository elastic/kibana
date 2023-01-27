/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { withApmSpan } from '../../../utils/with_apm_span';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getServicesItems } from './get_services_items';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';

export async function getServices({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  searchAggregatedTransactions,
  searchAggregatedServiceMetrics,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  searchAggregatedTransactions: boolean;
  searchAggregatedServiceMetrics: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_services', async () => {
    const { items, maxServiceCountExceeded, overflowCount } =
      await getServicesItems({
        environment,
        kuery,
        mlClient,
        apmEventClient,
        apmAlertsClient,
        searchAggregatedTransactions,
        searchAggregatedServiceMetrics,
        logger,
        start,
        end,
        serviceGroup,
        randomSampler,
      });

    return {
      items,
      maxServiceCountExceeded,
      overflowCount,
    };
  });
}
