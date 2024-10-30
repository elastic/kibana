/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPolicyDataStreamsIfNeeded } from '../../fleet_integration/handlers/create_policy_datastreams';
import type { EndpointAppContextService } from '../endpoint_app_context_services';

export const ensureIndicesExistsForPolicies = async (
  endpointServices: EndpointAppContextService
): Promise<void> => {
  const logger = endpointServices.createLogger('startupPolicyIndicesChecker');

  const fleetServices = endpointServices.getInternalFleetServices();
  const soClient = fleetServices.savedObjects.createInternalUnscopedSoClient();
  const endpointPoliciesIds = await fleetServices.packagePolicy.listIds(soClient, {
    kuery: fleetServices.endpointPolicyKuery,
    perPage: 10000,
  });

  logger.info(
    `Checking to ensure [${endpointPoliciesIds.items.length}] endpoint policies have backing indices`
  );

  await createPolicyDataStreamsIfNeeded({
    endpointServices,
    endpointPolicyIds: endpointPoliciesIds.items,
  });
};
