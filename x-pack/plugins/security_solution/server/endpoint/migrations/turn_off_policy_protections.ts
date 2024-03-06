/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import {
  ensureOnlyEventCollectionIsAllowed,
  isPolicySetToEventCollectionOnly,
} from '../../../common/endpoint/models/policy_config_helpers';
import type { PolicyData } from '../../../common/endpoint/types';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import { getPolicyDataForUpdate } from '../../../common/endpoint/service/policy';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';

export const turnOffPolicyProtectionsIfNotSupported = async (
  esClient: ElasticsearchClient,
  fleetServices: EndpointInternalFleetServicesInterface,
  productFeaturesService: ProductFeaturesService,
  logger: Logger
): Promise<void> => {
  const log = logger.get('endpoint', 'policyProtections');

  const isProtectionUpdatesFeatureEnabled = productFeaturesService.isEnabled(
    ProductFeatureSecurityKey.endpointProtectionUpdates
  );

  const isPolicyProtectionsEnabled = productFeaturesService.isEnabled(
    ProductFeatureSecurityKey.endpointPolicyProtections
  );

  if (isPolicyProtectionsEnabled) {
    log.info(
      `App feature [${ProductFeatureSecurityKey.endpointPolicyProtections}] is enabled. Nothing to do!`
    );
  }

  if (isProtectionUpdatesFeatureEnabled) {
    log.info(
      `App feature [${ProductFeatureSecurityKey.endpointProtectionUpdates}] is enabled. Nothing to do!`
    );
  }

  if (isPolicyProtectionsEnabled && isProtectionUpdatesFeatureEnabled) {
    return;
  }

  if (!isPolicyProtectionsEnabled) {
    log.info(
      `App feature [${ProductFeatureSecurityKey.endpointPolicyProtections}] is disabled. Checking endpoint integration policies for compliance`
    );
  }

  if (!isProtectionUpdatesFeatureEnabled) {
    log.info(
      `App feature [${ProductFeatureSecurityKey.endpointProtectionUpdates}] is disabled. Checking endpoint integration policies for compliance`
    );
  }

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
      const shouldDowngradeProtectionUpdates =
        !isProtectionUpdatesFeatureEnabled && policySettings.global_manifest_version !== 'latest';

      if (!isPolicyProtectionsEnabled && !isOnlyCollectingEvents) {
        messages.push(
          `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to disable protections. Trigger: [${message}]`
        );

        if (shouldDowngradeProtectionUpdates) {
          messages.push(
            `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to downgrade protection updates.`
          );
        }

        integrationPolicy.inputs[0].config.policy.value = {
          ...ensureOnlyEventCollectionIsAllowed(policySettings),
          ...(shouldDowngradeProtectionUpdates ? { global_manifest_version: 'latest' } : {}),
        };

        updates.push({
          ...getPolicyDataForUpdate(integrationPolicy),
          id: integrationPolicy.id,
        });
      } else if (shouldDowngradeProtectionUpdates) {
        messages.push(
          `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to downgrade protection updates.`
        );

        integrationPolicy.inputs[0].config.policy.value.global_manifest_version = 'latest';

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
