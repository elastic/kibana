/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../mock';
import { createFleetTestRendererMock } from '../mock';

import type { AgentPolicy, Agent } from '../types';

import { AgentPolicySummaryLine } from './link_and_revision';

jest.mock('../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
}));

describe('AgentPolicySummaryLine', () => {
  let testRenderer: TestRenderer;

  const render = (agentPolicy: AgentPolicy, agent?: Agent) =>
    testRenderer.render(<AgentPolicySummaryLine policy={agentPolicy} agent={agent} />);

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('it should render policy and revision if no agent is provided', async () => {
    const results = render({ name: 'test', revision: 2 } as AgentPolicy);
    expect(results.container.textContent).toBe('testrev. 2');
  });

  test('it should render policy without revision if the agent do not have revision', async () => {
    const results = render({ name: 'test', revision: 1 } as AgentPolicy, {} as Agent);
    expect(results.container.textContent).toBe('test');
  });

  test('it should render policy with agent revision if an agent is provided', async () => {
    const results = render(
      { name: 'test', revision: 2 } as AgentPolicy,
      { policy_revision: 1 } as Agent
    );
    expect(results.container.textContent).toBe('testrev. 1');
  });
});
