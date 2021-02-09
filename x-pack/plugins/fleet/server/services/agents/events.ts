/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { AGENT_EVENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentEventSOAttributes, AgentEvent } from '../../types';
import { normalizeKuery } from '../saved_object';

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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { total, saved_objects } = await soClient.find<AgentEventSOAttributes>({
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    filter:
      kuery && kuery !== '' ? normalizeKuery(AGENT_EVENT_SAVED_OBJECT_TYPE, kuery) : undefined,
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
