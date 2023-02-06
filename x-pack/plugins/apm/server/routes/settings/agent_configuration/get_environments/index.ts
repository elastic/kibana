/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { getAllEnvironments } from '../../../environments/get_all_environments';
import { getExistingEnvironmentsForService } from './get_existing_environments_for_service';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { APMInternalESClient } from '../../../../lib/helpers/create_es_client/create_internal_es_client';

export async function getEnvironments({
  serviceName,
  internalESClient,
  apmEventClient,
  searchAggregatedTransactions,
  size,
}: {
  serviceName: string | undefined;
  internalESClient: APMInternalESClient;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  size: number;
}) {
  return withApmSpan('get_environments_for_agent_configuration', async () => {
    const [allEnvironments, existingEnvironments] = await Promise.all([
      getAllEnvironments({
        searchAggregatedTransactions,
        serviceName,
        apmEventClient,
        size,
      }),
      getExistingEnvironmentsForService({
        serviceName,
        internalESClient,
        size,
      }),
    ]);

    return [ALL_OPTION_VALUE, ...allEnvironments].map((environment) => {
      return {
        name: environment,
        alreadyConfigured: existingEnvironments.includes(environment),
      };
    });
  });
}
