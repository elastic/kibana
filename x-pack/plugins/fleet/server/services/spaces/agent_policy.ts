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
} from '../../../common/constants';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { packagePolicyService } from '../package_policy';
import { FleetError } from '../../errors';

import { isSpaceAwarenessEnabled } from './helpers';

export async function updateAgentPolicySpaces({
  agentPolicyId,
  currentSpaceId,
  newSpaceIds,
  authorizedSpaces,
}: {
  agentPolicyId: string;
  currentSpaceId: string;
  newSpaceIds: string[];
  authorizedSpaces: string[];
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

  if (deepEqual(existingPolicy?.space_ids?.sort() ?? [DEFAULT_SPACE_ID], newSpaceIds.sort())) {
    return;
  }

  const spacesToAdd = newSpaceIds.filter(
    (spaceId) => !existingPolicy?.space_ids?.includes(spaceId) ?? true
  );
  const spacesToRemove =
    existingPolicy?.space_ids?.filter((spaceId) => !newSpaceIds.includes(spaceId) ?? true) ?? [];

  // Privileges check
  for (const spaceId of spacesToAdd) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`No enough permissions to create policies in space ${spaceId}`);
    }
  }

  for (const spaceId of spacesToRemove) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`No enough permissions to remove policies from space ${spaceId}`);
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

  // Update fleet server index agents, enrollment api keys
  await esClient.updateByQuery({
    index: ENROLLMENT_API_KEYS_INDEX,
    script: `ctx._source.namespaces = [${newSpaceIds.map((spaceId) => `"${spaceId}"`).join(',')}]`,
    ignore_unavailable: true,
    refresh: true,
  });
  await esClient.updateByQuery({
    index: AGENTS_INDEX,
    script: `ctx._source.namespaces = [${newSpaceIds.map((spaceId) => `"${spaceId}"`).join(',')}]`,
    ignore_unavailable: true,
    refresh: true,
  });
}
