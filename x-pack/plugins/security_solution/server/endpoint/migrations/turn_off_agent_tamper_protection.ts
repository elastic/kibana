/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */
//
// import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
// import type { Logger } from '@kbn/logging';
// import { AppFeatureSecurityKey } from '@kbn/security-solution-features/src/app_features_keys';
// import type { AgentPolicy } from '@kbn/fleet-plugin/common';
// import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
// import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
// import type { AppFeaturesService } from '../../lib/app_features_service';
// import {
//   ensureOnlyEventCollectionIsAllowed,
//   isPolicySetToEventCollectionOnly,
// } from '../../../common/endpoint/models/policy_config_helpers';
// import { getPolicyDataForUpdate } from '../../../common/endpoint/service/policy';
//
// export const turnOffAgentTamperProtectionIfNotSupported = async (
//   esClient: ElasticsearchClient,
//   fleetServices: EndpointInternalFleetServicesInterface,
//   appFeaturesService: AppFeaturesService,
//   logger: Logger
// ): Promise<void> => {
//   const log = logger.get('endpoint', 'agentPolicy');
//
//   if (appFeaturesService.isEnabled(AppFeatureSecurityKey.endpointAgentTamperProtection)) {
//     log.info(
//       `App feature [${AppFeatureSecurityKey.endpointAgentTamperProtection}] is enabled. Nothing to do!`
//     );
//
//     return;
//   }
//
//   log.info(
//     `App feature [${AppFeatureSecurityKey.endpointAgentTamperProtection}] is disabled. Checking endpoint integration policies for compliance`
//   );
//
//   const { agentPolicy, internalSoClient } = fleetServices;
//   const updates: AgentPolicy[] = [];
//   const messages: string[] = [];
//   const perPage = 1000;
//   let hasMoreData = true;
//   let total = 0;
//   let page = 1;
//
//   do {
//     const currentPage = page++;
//     const { items, total: totalPolicies } = await agentPolicy.list(internalSoClient, {
//       page: currentPage,
//       kuery: 'ingest-agent-policies.is_protected: true',
//       perPage,
//     });
//
//     total = totalPolicies;
//     hasMoreData = currentPage * perPage < total;
//
//     for (const item of items) {
//       const integrationPolicy = item;
//       const policySettings = integrationPolicy.inputs[0].config.policy.value;
//       const { message, isOnlyCollectingEvents } = isPolicySetToEventCollectionOnly(policySettings);
//
//       if (!isOnlyCollectingEvents) {
//         messages.push(
//           `Policy [${integrationPolicy.id}][${integrationPolicy.name}] updated to disable protections. Trigger: [${message}]`
//         );
//
//         integrationPolicy.inputs[0].config.policy.value =
//           ensureOnlyEventCollectionIsAllowed(policySettings);
//
//         updates.push({
//           ...getPolicyDataForUpdate(integrationPolicy),
//           id: integrationPolicy.id,
//         });
//       }
//     }
//   } while (hasMoreData);
//
//   if (updates.length > 0) {
//     log.info(`Found ${updates.length} policies that need updates:\n${messages.join('\n')}`);
//
//     const bulkUpdateResponse = await fleetServices.packagePolicy.bulkUpdate(
//       internalSoClient,
//       esClient,
//       updates,
//       {
//         user: { username: 'elastic' } as AuthenticatedUser,
//       }
//     );
//
//     log.debug(`Bulk update response:\n${JSON.stringify(bulkUpdateResponse, null, 2)}`);
//
//     if (bulkUpdateResponse.failedPolicies.length > 0) {
//       log.error(
//         `Done. ${bulkUpdateResponse.failedPolicies.length} out of ${
//           updates.length
//         } failed to update:\n${JSON.stringify(bulkUpdateResponse.failedPolicies, null, 2)}`
//       );
//     } else {
//       log.info(`Done. All updates applied successfully`);
//     }
//   } else {
//     log.info(`Done. Checked ${total} policies and no updates needed`);
//   }
// };
