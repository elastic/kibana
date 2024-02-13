/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import type { AppFeaturesService } from '../../lib/app_features_service/app_features_service';

export const turnOffAgentPolicyFeatures = async (
  fleetServices: EndpointInternalFleetServicesInterface,
  appFeaturesService: AppFeaturesService,
  logger: Logger
): Promise<void> => {
  const log = logger.get('endpoint', 'agentPolicyFeatures');

  if (appFeaturesService.isEnabled(AppFeatureSecurityKey.endpointAgentTamperProtection)) {
    log.info(
      `App feature [${AppFeatureSecurityKey.endpointAgentTamperProtection}] is enabled. Nothing to do!`
    );

    return;
  }

  log.info(
    `App feature [${AppFeatureSecurityKey.endpointAgentTamperProtection}] is disabled. Checking fleet agent policies for compliance`
  );

  const { agentPolicy: agentPolicyService, internalSoClient } = fleetServices;
  const { updatedPolicies, failedPolicies } =
    await agentPolicyService.turnOffAgentTamperProtections(internalSoClient);

  if (!updatedPolicies && !failedPolicies.length) {
    log.info(`All agent policies are compliant, nothing to do!`);
  } else if (updatedPolicies && failedPolicies.length) {
    const totalPolicies = updatedPolicies.length + failedPolicies.length;
    logger.error(
      `Done - ${
        failedPolicies.length
      } out of ${totalPolicies} were successful. Errors encountered:\n${failedPolicies
        .map((e) => `Policy [${e.id}] failed to update due to error: ${e.error}`)
        .join('\n')}`
    );
  } else if (updatedPolicies) {
    logger.info(
      `Done - ${updatedPolicies.length} out of ${updatedPolicies.length} were successful. No errors encountered.`
    );
  } else {
    logger.error(
      `Done - all ${failedPolicies.length} failed to update. Errors encountered:\n${failedPolicies
        .map((e) => `Policy [${e.id}] failed to update due to error: ${e.error}`)
        .join('\n')}`
    );
  }
};
