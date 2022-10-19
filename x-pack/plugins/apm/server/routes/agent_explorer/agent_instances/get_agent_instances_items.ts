/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { Setup } from '../../../lib/helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getAgentInstancesDetails } from './get_agent_instances_details';

export type AgenItemsSetup = Setup;

const MAX_NUMBER_OF_SERVICES = 500;

export async function getAgentInstancesItems({
  serviceName,
  kuery,
  setup,
  start,
  end,
  randomSampler,
}: {
  serviceName: string;
  kuery: string;
  setup: AgenItemsSetup;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_agent_instances_items', async () => {
    const params = {
      serviceName,
      kuery,
      setup,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
      start,
      end,
      randomSampler,
    };

    return getAgentInstancesDetails(params);
  });
}
