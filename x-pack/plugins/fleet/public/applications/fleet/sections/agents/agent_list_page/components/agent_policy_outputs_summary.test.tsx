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

import type { OutputsForAgentPolicy } from '../../../../../../../common/types';

import { AgentPolicyOutputsSummary } from './agent_policy_outputs_summary';

describe('MultipleAgentPolicySummaryLine', () => {
  let testRenderer: TestRenderer;
  const outputsForPolicy: OutputsForAgentPolicy = {
    agentPolicyId: 'policy-1',
    monitoring: {
      output: {
        id: 'elasticsearch1',
        name: 'Elasticsearch1',
      },
    },
    data: {
      output: {
        id: 'elasticsearch1',
        name: 'Elasticsearch1',
      },
    },
  };
  const data = {
    data: {
      output: {
        id: 'elasticsearch1',
        name: 'Elasticsearch1',
      },
      integrations: [
        {
          id: 'remote_es1',
          name: 'Remote ES',
          pkgName: 'ngnix',
          integrationPolicyName: 'Nginx-1',
        },

        {
          id: 'logstash',
          name: 'Logstash-1',
          pkgName: 'apache',
          integrationPolicyName: 'Apache-1',
        },
      ],
    },
  };

  const render = (outputs?: OutputsForAgentPolicy, isMonitoring?: boolean) =>
    testRenderer.render(
      <AgentPolicyOutputsSummary outputs={outputs} isMonitoring={isMonitoring} />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('it should render the name associated with the default output when the agent policy does not have custom outputs', async () => {
    const results = render(outputsForPolicy);
    expect(results.container.textContent).toBe('Elasticsearch1');
    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputsIntegrationsNumberBadge')).not.toBeInTheDocument();
  });

  test('it should render the first output name and the badge when there are multiple outputs associated with integrations', async () => {
    const results = render({ ...outputsForPolicy, ...data });

    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputsIntegrationsNumberBadge')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(results.getByTestId('outputsIntegrationsNumberBadge'));
    });
    expect(results.queryByTestId('outputPopover')).toBeInTheDocument();
    expect(results.queryByTestId('output-integration-0')?.textContent).toContain(
      'Nginx-1: Remote ES'
    );
    expect(results.queryByTestId('output-integration-1')?.textContent).toContain(
      'Apache-1: Logstash-1'
    );
  });

  test('it should not render the badge when monitoring is true', async () => {
    const results = render({ ...outputsForPolicy, ...data }, true);

    expect(results.queryByTestId('outputNameLink')).toBeInTheDocument();
    expect(results.queryByTestId('outputsIntegrationsNumberBadge')).not.toBeInTheDocument();
  });
});
