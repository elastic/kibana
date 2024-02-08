/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AppFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import pMap from 'p-map';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import type { AppFeaturesService } from '../../lib/app_features_service/app_features_service';

export const turnOffAgentPolicyFeatures = async (
  esClient: ElasticsearchClient,
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
  const updates: AgentPolicy[] = [];
  const messages: string[] = [];
  const perPage = 1000;
  let hasMoreData = true;
  let total = 0;
  let page = 1;

  do {
    const currentPage = page++;
    const { items, total: totalPolicies } = await agentPolicyService.list(internalSoClient, {
      page: currentPage,
      kuery: 'ingest-agent-policies.is_protected: true',
      perPage,
    });

    total = totalPolicies;
    hasMoreData = currentPage * perPage < total;

    for (const item of items) {
      messages.push(
        `Policy [${item.id}][${item.name}] updated to disable agent tamper protection.`
      );

      updates.push({ ...item, is_protected: false });
    }
  } while (hasMoreData);

  if (updates.length > 0) {
    logger.info(`Found ${updates.length} policies that need updates:\n${messages.join('\n')}`);
    const policyUpdateErrors: Array<{ id: string; error: Error }> = [];
    await pMap(updates, async (update) => {
      try {
        return await agentPolicyService.bumpRevision(internalSoClient, esClient, update.id, {
          user: { username: 'elastic' } as AuthenticatedUser,
          removeProtection: true,
        });
      } catch (error) {
        policyUpdateErrors.push({ error, id: update.id });
      }
    });

    if (policyUpdateErrors.length > 0) {
      logger.error(
        `Done - ${policyUpdateErrors.length} out of ${
          updates.length
        } were successful. Errors encountered:\n${policyUpdateErrors
          .map((e) => `Policy [${e.id}] failed to update due to error: ${e.error}`)
          .join('\n')}`
      );
    } else {
      logger.info(`Done. All updates applied successfully`);
    }
  } else {
    logger.info(`Done. Checked ${total} policies and no updates needed`);
  }
};
