/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import {
  isPolicySetToEventCollectionOnly,
  ensureOnlyEventCollectionIsAllowed,
} from '../../../common/endpoint/models/policy_config_helpers';
import type { PolicyData } from '../../../common/endpoint/types';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import { getPolicyDataForUpdate } from '../../../common/endpoint/service/policy';
import type { AppFeaturesService } from '../../lib/app_features_service/app_features_service';

export const turnOffPolicyProtectionsIfNotSupported = async (
  esClient: ElasticsearchClient,
  fleetServices: EndpointInternalFleetServicesInterface,
  appFeaturesService: AppFeaturesService,
  logger: Logger
): Promise<void> => {
  const log = logger.get('endpoint', 'policyProtections');

  if (appFeaturesService.isEnabled(AppFeatureSecurityKey.endpointPolicyProtections)) {
    log.info(
      `App feature [${AppFeatureSecurityKey.endpointPolicyProtections}] is enabled. Nothing to do!`
    );

    return;
  }

  log.info(
    `App feature [${AppFeatureSecurityKey.endpointPolicyProtections}] is disabled. Checking endpoint integration policies for compliance`
  );

  const { packagePolicy, internalSoClient, endpointPolicyKuery } = fleetServices;
  const updates: UpdatePackagePolicy[] = [];
  const messages: string[] = [];
  const perPage = 1000;
  let hasMoreData = true;
  let total = 0;
  let page = 1;

  do {
    const currentPage = page++;
    const { items, total: totalPolicies } = await packagePolicy.list(internalSoClient, {
      page: currentPage,
      kuery: endpointPolicyKuery,
      perPage,
    });

    total = totalPolicies;
    hasMoreData = currentPage * perPage < total;

    for (const item of items) {
      const integrationPolicy = item as PolicyData;
      const policySettings = integrationPolicy.inputs[0].config.policy.value;
      const { message, isOnlyCollectingEvents } = isPolicySetToEventCollectionOnly(policySettings);

      if (!isOnlyCollectingEvents) {
        messages.push(
          `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to disable protections. Trigger: [${message}]`
        );

        integrationPolicy.inputs[0].config.policy.value =
          ensureOnlyEventCollectionIsAllowed(policySettings);

        updates.push({
          ...getPolicyDataForUpdate(integrationPolicy),
          id: integrationPolicy.id,
        });
      }
    }
  } while (hasMoreData);

  if (updates.length > 0) {
    log.info(`Found ${updates.length} policies that need updates:\n${messages.join('\n')}`);

    const bulkUpdateResponse = await fleetServices.packagePolicy.bulkUpdate(
      internalSoClient,
      esClient,
      updates,
      {
        user: { username: 'elastic' } as AuthenticatedUser,
      }
    );

    log.debug(`Bulk update response:\n${JSON.stringify(bulkUpdateResponse, null, 2)}`);

    if (bulkUpdateResponse.failedPolicies.length > 0) {
      log.error(
        `Done. ${bulkUpdateResponse.failedPolicies.length} out of ${
          updates.length
        } failed to update:\n${JSON.stringify(bulkUpdateResponse.failedPolicies, null, 2)}`
      );
    } else {
      log.info(`Done. All updates applied successfully`);
    }
  } else {
    log.info(`Done. Checked ${total} policies and no updates needed`);
  }
};
