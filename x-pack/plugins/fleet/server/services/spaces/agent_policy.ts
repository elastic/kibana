/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import {
  AGENTS_INDEX,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
} from '../../../common/constants';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { packagePolicyService } from '../package_policy';
import { FleetError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import type { UninstallTokenSOAttributes } from '../security/uninstall_token_service';

import { isSpaceAwarenessEnabled } from './helpers';

export async function updateAgentPolicySpaces({
  agentPolicyId,
  currentSpaceId,
  newSpaceIds,
  authorizedSpaces,
  options,
}: {
  agentPolicyId: string;
  currentSpaceId: string;
  newSpaceIds: string[];
  authorizedSpaces: string[];
  options?: { force?: boolean };
}) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness || !newSpaceIds || newSpaceIds.length === 0) {
    return;
  }

  const esClient = appContextService.getInternalUserESClient();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const currentSpaceSoClient = appContextService.getInternalUserSOClientForSpaceId(currentSpaceId);
  const existingPolicy = await agentPolicyService.get(currentSpaceSoClient, agentPolicyId);

  const existingPackagePolicies = await packagePolicyService.findAllForAgentPolicy(
    currentSpaceSoClient,
    agentPolicyId
  );

  if (!existingPolicy) {
    return;
  }

  if (existingPolicy.is_managed && !options?.force) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot update hosted agent policy ${existingPolicy.id} space `
    );
  }

  if (deepEqual(existingPolicy?.space_ids?.sort() ?? [DEFAULT_SPACE_ID], newSpaceIds.sort())) {
    return;
  }

  if (existingPackagePolicies.some((packagePolicy) => packagePolicy.policy_ids.length > 1)) {
    throw new FleetError(
      'Agent policies using reusable integration policies cannot be moved to a different space.'
    );
  }
  const spacesToAdd = newSpaceIds.filter(
    (spaceId) => !existingPolicy?.space_ids?.includes(spaceId) ?? true
  );
  const spacesToRemove =
    existingPolicy?.space_ids?.filter((spaceId) => !newSpaceIds.includes(spaceId) ?? true) ?? [];

  // Privileges check
  for (const spaceId of spacesToAdd) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`Not enough permissions to create policies in space ${spaceId}`);
    }
  }

  for (const spaceId of spacesToRemove) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`Not enough permissions to remove policies from space ${spaceId}`);
    }
  }

  const res = await soClient.updateObjectsSpaces(
    [
      {
        id: agentPolicyId,
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      },
      ...existingPackagePolicies.map(({ id }) => ({
        id,
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      })),
    ],
    spacesToAdd,
    spacesToRemove,
    { refresh: 'wait_for', namespace: currentSpaceId }
  );

  for (const soRes of res.objects) {
    if (soRes.error) {
      throw soRes.error;
    }
  }

  // Update uninstall tokens
  const uninstallTokensRes = await soClient.find<UninstallTokenSOAttributes>({
    perPage: SO_SEARCH_LIMIT,
    type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id:"${agentPolicyId}"`,
  });

  if (uninstallTokensRes.total > 0) {
    await soClient.bulkUpdate(
      uninstallTokensRes.saved_objects.map((so) => ({
        id: so.id,
        type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
        attributes: {
          namespaces: newSpaceIds,
        },
      }))
    );
  }

  // Update fleet server index agents, enrollment api keys
  await esClient.updateByQuery({
    index: ENROLLMENT_API_KEYS_INDEX,
    query: {
      bool: {
        must: {
          terms: {
            policy_id: [agentPolicyId],
          },
        },
      },
    },
    script: `ctx._source.namespaces = [${newSpaceIds.map((spaceId) => `"${spaceId}"`).join(',')}]`,
    ignore_unavailable: true,
    refresh: true,
  });
  await esClient.updateByQuery({
    index: AGENTS_INDEX,
    query: {
      bool: {
        must: {
          terms: {
            policy_id: [agentPolicyId],
          },
        },
      },
    },
    script: `ctx._source.namespaces = [${newSpaceIds.map((spaceId) => `"${spaceId}"`).join(',')}]`,
    ignore_unavailable: true,
    refresh: true,
  });
}
