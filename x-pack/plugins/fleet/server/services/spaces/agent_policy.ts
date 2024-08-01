/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { appContextService } from '../app_context';

export async function updateAgentPolicySpaces({
  agentPolicyId,
  currentSpaceId,
  newSpaceIds,
}: {
  agentPolicyId: string;
  currentSpaceId: string;
  newSpaceIds: string[];
}) {
  const esClient = appContextService.getInternalUserESClient();
  const soClient = appContextService.getInternalUserSOClient();
  // TODO Saved object need to be "multiple" for updateObjectsSpaces to
  const res = await soClient
    .updateObjectsSpaces(
      [
        {
          id: agentPolicyId,
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          spaces: [currentSpaceId],
        },
      ],
      newSpaceIds,
      [currentSpaceId],
      { refresh: 'wait_for' }
    )
    .catch(console.log);
  // Update saved object

  // Update agents
}
