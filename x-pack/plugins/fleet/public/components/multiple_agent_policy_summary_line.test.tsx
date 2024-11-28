/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent } from '@testing-library/react';
import React from 'react';

import type { TestRenderer } from '../mock';
import { createFleetTestRendererMock } from '../mock';

import type { AgentPolicy } from '../types';

import { MultipleAgentPoliciesSummaryLine } from './multiple_agent_policy_summary_line';

// FLAKY: https://github.com/elastic/kibana/issues/200786
describe.skip('MultipleAgentPolicySummaryLine', () => {
  let testRenderer: TestRenderer;

  const render = (agentPolicies: AgentPolicy[]) =>
    testRenderer.render(
      <MultipleAgentPoliciesSummaryLine
        policies={agentPolicies}
        packagePolicyId="policy1"
        onAgentPoliciesChange={jest.fn()}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('it should only render the policy name when there is only one policy', async () => {
    const results = render([{ name: 'Test policy', revision: 2 }] as AgentPolicy[]);
    expect(results.container.textContent).toBe('Test policyrev. 2');
    expect(results.queryByTestId('agentPolicyNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('agentPoliciesNumberBadge')).not.toBeInTheDocument();
  });

  test('it should render the first policy name and the badge when there are multiple policies', async () => {
    const results = render([
      { name: 'Test policy 1', id: '0001' },
      { name: 'Test policy 2', id: '0002' },
      { name: 'Test policy 3', id: '0003' },
    ] as AgentPolicy[]);
    expect(results.queryByTestId('agentPolicyNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('agentPoliciesNumberBadge')).toBeInTheDocument();
    expect(results.container.textContent).toBe('Test policy 1+2');

    await act(async () => {
      fireEvent.click(results.getByTestId('agentPoliciesNumberBadge'));
    });
    expect(results.queryByTestId('agentPoliciesPopover')).toBeInTheDocument();
    expect(results.queryByTestId('agentPoliciesPopoverButton')).toBeInTheDocument();
    expect(results.queryByTestId('policy-0001')).toBeInTheDocument();
    expect(results.queryByTestId('policy-0002')).toBeInTheDocument();
    expect(results.queryByTestId('policy-0003')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(results.getByTestId('agentPoliciesPopoverButton'));
    });

    expect(results.queryByTestId('manageAgentPoliciesModal')).toBeInTheDocument();
  });
});
