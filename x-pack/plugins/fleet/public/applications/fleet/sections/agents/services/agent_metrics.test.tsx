/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import type { Agent, AgentPolicy } from '../../../../../../common/types';

import { useAgentDashboardLink } from '../agent_details_page/hooks';

import { AgentCPU } from './agent_metrics';

jest.mock('../agent_details_page/hooks', () => ({
  useAgentDashboardLink: jest.fn((agent: Agent) => ({
    isLoading: false,
    isInstalled: true,
    link: `app/dashboards#/view/elastic_agent-${agent.id}`,
  })),
}));

jest.mock('../components/metric_non_available', () => {
  return {
    MetricNonAvailable: () => <>N/A</>,
  };
});

describe('Agent metrics helper', () => {
  describe('AgentCPU', () => {
    it('should return 0% if cpu is 0.00002', () => {
      const component = shallow(
        <AgentCPU
          agent={
            {
              id: '01',
              metrics: {
                cpu_avg: 0.00002,
                memory_size_byte_avg: 2000,
              },
            } as Agent
          }
          agentPolicy={{} as AgentPolicy}
        />
      );

      expect(component).toMatchSnapshot();
    });

    it('should return 5% if cpu is 0.005', () => {
      const component = shallow(
        <AgentCPU
          agent={
            {
              id: '02',
              metrics: {
                cpu_avg: 0.005,
                memory_size_byte_avg: 2000,
              },
            } as Agent
          }
          agentPolicy={{} as AgentPolicy}
        />
      );

      expect(component).toMatchSnapshot();
    });

    it('should return N/A if cpu is undefined', () => {
      const component = shallow(
        <AgentCPU
          agent={
            {
              id: '03',
              metrics: {
                cpu_avg: undefined,
                memory_size_byte_avg: 2000,
              },
            } as Agent
          }
          agentPolicy={{} as AgentPolicy}
        />
      );

      expect(component).toMatchSnapshot();
    });

    it('CPU value should have disabled link when agent is not installed or is still loading', () => {
      (useAgentDashboardLink as jest.Mock).mockReturnValueOnce((agent: Agent) => ({
        isLoading: false,
        isInstalled: false,
        link: `app/dashboards#/view/elastic_agent-${agent.id}`,
      }));

      const notYetInstalledComponent = shallow(
        <AgentCPU
          agent={
            {
              id: '04',
              metrics: {
                cpu_avg: 0.02,
                memory_size_byte_avg: 2000,
              },
            } as Agent
          }
          agentPolicy={{} as AgentPolicy}
        />
      );
      expect(notYetInstalledComponent).toMatchSnapshot();

      (useAgentDashboardLink as jest.Mock).mockReturnValueOnce((agent: Agent) => ({
        isLoading: true,
        isInstalled: true,
        link: `app/dashboards#/view/elastic_agent-${agent.id}`,
      }));

      const isLoadingComponent = shallow(
        <AgentCPU
          agent={
            {
              id: '05',
              metrics: {
                cpu_avg: 0.02,
                memory_size_byte_avg: 2000,
              },
            } as Agent
          }
          agentPolicy={{} as AgentPolicy}
        />
      );
      expect(isLoadingComponent).toMatchSnapshot();
    });
  });
});
