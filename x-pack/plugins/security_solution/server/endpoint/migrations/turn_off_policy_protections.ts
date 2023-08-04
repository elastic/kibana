/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isPolicySetToEventCollectionOnly } from '../../../common/endpoint/models/policy_config_helpers';
import type { PolicyData } from '../../../common/endpoint/types';
import { AppFeatureSecurityKey } from '../../../common/types/app_features';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import type { AppFeatures } from '../../lib/app_features';

export const turnOffPolicyProtections = async (
  fleetServices: EndpointInternalFleetServicesInterface,
  appFeaturesService: AppFeatures,
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
  const updates = [];
  const messages: string[] = [];
  let hasMoreData = true;
  let page = 1;

  do {
    const { items } = await packagePolicy.list(internalSoClient, {
      page: page++,
      kuery: endpointPolicyKuery,
      perPage: 100,
    });

    hasMoreData = items.length > 0;

    for (const item of items) {
      const integrationPolicy = item as PolicyData;
      const policySettings = integrationPolicy.inputs[0].config.policy.value;
      const { message, isOnlyCollectingEvents } = isPolicySetToEventCollectionOnly(policySettings);

      if (!isOnlyCollectingEvents) {
        messages.push(
          `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to disable protections. Trigger: [${message}]`
        );

        // FIXME:PT prepare the update
      }
    }
  } while (hasMoreData);

  if (updates.length > 0) {
    // FIXME:PT make the update by calling bulkUpdate
  } else {
    log.info(`Done. No policies needed updating.`);
  }
};
