/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsBulkUpdateObject } from 'src/core/server';
import { appContextService } from '../../app_context';
import { AgentSOAttributes } from '../../../types';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../constants';

function getInternalUserSOClient() {
  const fakeRequest = ({
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown) as KibanaRequest;

  return appContextService.getInternalUserSOClient(fakeRequest);
}
export function agentCheckinStateConnectedAgentsFactory() {
  const connectedAgentsIds = new Set<string>();
  let agentToUpdate = new Set<string>();

  function addAgent(agentId: string) {
    connectedAgentsIds.add(agentId);
    agentToUpdate.add(agentId);
  }

  function removeAgent(agentId: string) {
    connectedAgentsIds.delete(agentId);
  }

  async function wrapPromise<T>(agentId: string, p: Promise<T>): Promise<T> {
    try {
      addAgent(agentId);
      const res = await p;
      removeAgent(agentId);
      return res;
    } catch (err) {
      removeAgent(agentId);
      throw err;
    }
  }

  async function updateLastCheckinAt() {
    if (agentToUpdate.size === 0) {
      return;
    }
    const internalSOClient = getInternalUserSOClient();
    const now = new Date().toISOString();
    const updates: Array<SavedObjectsBulkUpdateObject<AgentSOAttributes>> = [
      ...agentToUpdate.values(),
    ].map((agentId) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agentId,
      attributes: {
        last_checkin: now,
      },
    }));

    agentToUpdate = new Set<string>([...connectedAgentsIds.values()]);
    await internalSOClient.bulkUpdate<AgentSOAttributes>(updates, { refresh: false });
  }

  return {
    wrapPromise,
    updateLastCheckinAt,
  };
}
