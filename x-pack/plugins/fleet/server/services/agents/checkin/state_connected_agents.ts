/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { appContextService } from '../../app_context';
import { bulkUpdateAgents } from '../crud';

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
    const esClient = appContextService.getInternalUserESClient();
    const internalSOClient = getInternalUserSOClient();
    const now = new Date().toISOString();
    const updates = [...agentToUpdate.values()].map((agentId) => ({
      agentId,
      data: {
        last_checkin: now,
      },
    }));
    agentToUpdate = new Set<string>([...connectedAgentsIds.values()]);
    await bulkUpdateAgents(internalSOClient, esClient, updates);
  }

  return {
    wrapPromise,
    updateLastCheckinAt,
  };
}
