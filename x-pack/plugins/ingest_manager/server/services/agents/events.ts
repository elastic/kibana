/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentEventSOAttributes, AgentEvent } from '../../types';

export async function getAgentEvents(
  soClient: SavedObjectsClientContract,
  agentId: string,
  options: {
    kuery?: string;
    page: number;
    perPage: number;
  }
) {
  const { page, perPage, kuery } = options;

  const { total, saved_objects } = await soClient.find<AgentEventSOAttributes>({
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    filter:
      kuery && kuery !== ''
        ? kuery.replace(
            new RegExp(`${AGENT_EVENT_SAVED_OBJECT_TYPE}\.`, 'g'),
            `${AGENT_EVENT_SAVED_OBJECT_TYPE}.attributes.`
          )
        : undefined,
    perPage,
    page,
    sortField: 'timestamp',
    sortOrder: 'desc',
    defaultSearchOperator: 'AND',
    search: agentId,
    searchFields: ['agent_id'],
  });

  const items: AgentEvent[] = saved_objects.map((so) => {
    return {
      id: so.id,
      ...so.attributes,
      payload: so.attributes.payload ? JSON.parse(so.attributes.payload) : undefined,
    };
  });

  return { items, total };
}
