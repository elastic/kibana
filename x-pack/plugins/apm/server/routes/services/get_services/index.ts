/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../../lib/helpers/setup_request';
import { getServicesItems } from './get_services_items';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';

export async function getServices({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_services', async () => {
    const items = await getServicesItems({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      logger,
      start,
      end,
      serviceGroup,
      randomSampler,
    });

    return {
      items,
    };
  });
}
