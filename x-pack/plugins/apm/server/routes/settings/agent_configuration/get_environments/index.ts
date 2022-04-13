/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { getAllEnvironments } from '../../../environments/get_all_environments';
import { Setup } from '../../../../lib/helpers/setup_request';
import { getExistingEnvironmentsForService } from './get_existing_environments_for_service';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';

export async function getEnvironments({
  serviceName,
  setup,
  searchAggregatedTransactions,
  size,
}: {
  serviceName: string | undefined;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  size: number;
}) {
  return withApmSpan('get_environments_for_agent_configuration', async () => {
    const [allEnvironments, existingEnvironments] = await Promise.all([
      getAllEnvironments({
        searchAggregatedTransactions,
        serviceName,
        setup,
        size,
      }),
      getExistingEnvironmentsForService({ serviceName, setup, size }),
    ]);

    return [ALL_OPTION_VALUE, ...allEnvironments].map((environment) => {
      return {
        name: environment,
        alreadyConfigured: existingEnvironments.includes(environment),
      };
    });
  });
}
