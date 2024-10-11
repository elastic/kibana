/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent } from '@testing-library/react';
import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { TestRenderer } from '../../../../../../mock';

import type { AgentPolicy, Output } from '../../../../types';
import { createAgentPolicyMock } from '../../../../../../../common/mocks';

import { AgentPolicyOutputsSummary } from './agent_policy_outputs_summary';

describe('MultipleAgentPolicySummaryLine', () => {
  let testRenderer: TestRenderer;
  const outputs: Output[] = [
    {
      id: 'elasticsearch1',
      name: 'Elasticsearch1',
      type: 'elasticsearch',
      is_default: false,
      is_default_monitoring: false,
      hosts: ['http://test.io:449'],
    },
    {
      id: 'logstash1',
      name: 'Logstash 1',
      type: 'logstash',
      is_default: true,
      is_default_monitoring: true,
      hosts: ['http://test.io:449'],
    },
    {
      id: 'remote_es1',
      name: 'Remote ES',
      type: 'remote_elasticsearch',
      is_default: false,
      is_default_monitoring: false,
      hosts: ['http://test.io:449', 'http://test.io:448', 'http://test.io:447'],
    },
  ];

  const render = (agentPolicy: AgentPolicy, monitoring?: boolean) =>
    testRenderer.render(
      <AgentPolicyOutputsSummary
        agentPolicy={agentPolicy}
        outputs={outputs}
        monitoring={monitoring}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('it should render the host associated with the default output when the agent policy does not have custom outputs', async () => {
    const mockAgentPolicy = createAgentPolicyMock();
    const results = render(mockAgentPolicy);
    expect(results.container.textContent).toBe('http://test.io:449');
    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputHostsNumberBadge')).not.toBeInTheDocument();
  });

  test('it should render the first host name and the badge when there are multiple hosts', async () => {
    const agentPolicy = createAgentPolicyMock({
      data_output_id: 'remote_es1',
      monitoring_output_id: 'remote_es1',
    });
    const results = render(agentPolicy);

    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputHostsNumberBadge')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(results.getByTestId('outputHostsNumberBadge'));
    });
    expect(results.queryByTestId('outputHostsPopover')).toBeInTheDocument();
    expect(results.queryByTestId('output-host-0')?.textContent).toContain('http://test.io:449');
    expect(results.queryByTestId('output-host-1')?.textContent).toContain('http://test.io:448');
    expect(results.queryByTestId('output-host-2')?.textContent).toContain('http://test.io:447');
  });

  test('it should not render the badge when monitoring is true', async () => {
    const agentPolicy = createAgentPolicyMock({
      data_output_id: 'remote_es1',
      monitoring_output_id: 'remote_es1',
    });
    const results = render(agentPolicy, true);

    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputHostsNumberBadge')).not.toBeInTheDocument();
  });
});
