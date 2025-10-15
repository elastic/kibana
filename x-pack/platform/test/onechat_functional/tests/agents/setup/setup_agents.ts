/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chatSystemIndex } from '@kbn/onechat-server';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

const agents = [
  { id: 'test_agent_1', name: 'Test Agent 1', labels: ['first'] },
  { id: 'test_agent_2', name: 'Test Agent 2', labels: ['second'] },
];

export function setupAgents({
  getPageObjects,
  getService,
}: {
  getPageObjects: FtrProviderContext['getPageObjects'];
  getService: FtrProviderContext['getService'];
}) {
  const { onechat } = getPageObjects(['onechat']);
  const es = getService('es');
  before(async function () {
    for (const agent of agents) {
      await onechat.createAgentViaUI(agent);
    }
  });

  after(async function () {
    await es.deleteByQuery({
      index: chatSystemIndex('agents'),
      query: { match_all: {} },
      wait_for_completion: true,
      refresh: true,
      conflicts: 'proceed',
    });
  });

  return agents;
}
