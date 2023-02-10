/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ThemeProvider } from 'styled-components';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { coreMock } from '@kbn/core/public/mocks';
import { registerTestBed } from '@kbn/test-jest-helpers';

import type { Agent } from '../../../../types';

import { FleetStatusProvider, ConfigContext, KibanaVersionContext } from '../../../../../../hooks';

import { getMockTheme } from '../../../../../../mocks';

import { ExperimentalFeaturesService } from '../../../../services';

import { SearchAndFilterBar } from './search_and_filter_bar';

const mockTheme = getMockTheme({
  eui: {
    euiSize: '10px',
  },
});

jest.mock('../../../../components', () => {
  return {
    SearchBar: () => <div />,
  };
});

const TestComponent = (props: any) => (
  <KibanaContextProvider services={coreMock.createStart()}>
    <ConfigContext.Provider value={{ agents: { enabled: true, elasticsearch: {} }, enabled: true }}>
      <KibanaVersionContext.Provider value={'8.2.0'}>
        <ThemeProvider theme={mockTheme}>
          <FleetStatusProvider>
            <SearchAndFilterBar {...props} />
          </FleetStatusProvider>
        </ThemeProvider>
      </KibanaVersionContext.Provider>
    </ConfigContext.Provider>
  </KibanaContextProvider>
);

describe('SearchAndFilterBar', () => {
  beforeAll(() => {
    // @ts-ignore - prevents us needing to mock the entire service
    ExperimentalFeaturesService.init({});
  });
  it('should show no Actions button when no agent is selected', async () => {
    const selectedAgents: Agent[] = [];
    const props: any = {
      totalAgents: 10,
      totalInactiveAgents: 2,
      selectionMode: 'manual',
      currentQuery: '',
      selectedAgents,
      refreshAgents: () => undefined,
      visibleAgents: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const testBed = registerTestBed(TestComponent)(props);
    const { exists } = testBed;

    expect(exists('agentBulkActionsButton')).toBe(false);
  });

  it('should show an Actions button when at least an agent is selected', async () => {
    const selectedAgents: Agent[] = [
      {
        id: 'Agent1',
        status: 'online',
        packages: ['system'],
        type: 'PERMANENT',
        active: true,
        enrolled_at: `${Date.now()}`,
        user_provided_metadata: {},
        local_metadata: {},
      },
    ];
    const props: any = {
      totalAgents: 10,
      totalInactiveAgents: 2,
      selectionMode: 'manual',
      currentQuery: '',
      selectedAgents,
      refreshAgents: () => undefined,
      visibleAgents: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const testBed = registerTestBed(TestComponent)(props);
    const { exists } = testBed;

    expect(exists('agentBulkActionsButton')).not.toBeNull();
  });

  it('should show an Actions button when agents selected in query mode', async () => {
    const props: any = {
      totalAgents: 10,
      totalInactiveAgents: 2,
      selectionMode: 'query',
      currentQuery: '',
      selectedAgents: [],
      refreshAgents: () => undefined,
      visibleAgents: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const testBed = registerTestBed(TestComponent)(props);
    const { exists } = testBed;

    expect(exists('agentBulkActionsButton')).not.toBeNull();
  });
});
