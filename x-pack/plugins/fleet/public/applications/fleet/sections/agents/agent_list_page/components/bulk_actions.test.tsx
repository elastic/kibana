/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, act } from '@testing-library/react';

import type { Agent } from '../../../../types';

import { createFleetTestRendererMock } from '../../../../../../mock';
import { ExperimentalFeaturesService } from '../../../../services';

import { sendGetAgents, sendGetAgentPolicies } from '../../../../hooks';

import { AgentBulkActions } from './bulk_actions';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetAgents: jest.fn(),
  sendGetAgentPolicies: jest.fn(),
}));

const mockedSendGetAgents = sendGetAgents as jest.Mock;
const mockedSendGetAgentPolicies = sendGetAgentPolicies as jest.Mock;

describe('AgentBulkActions', () => {
  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      diagnosticFileUploadEnabled: false,
    } as any);
  });

  function render(props: any) {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<AgentBulkActions {...props} />);
  }

  describe('When in manual mode', () => {
    it('should show only disabled actions if no agents are active', async () => {
      const selectedAgents: Agent[] = [{ id: 'agent1' }, { id: 'agent2' }] as Agent[];

      const props = {
        totalAgents: 10,
        totalInactiveAgents: 10,
        selectionMode: 'manual',
        currentQuery: '',
        selectedAgents,
        visibleAgents: [],
        refreshAgents: () => undefined,
        allTags: [],
        agentPolicies: [],
      };
      const results = render(props);

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');

      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeDisabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeDisabled();
      expect(results.getByText('Unenroll 2 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Upgrade 2 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeDisabled();
      expect(results.queryByText('Request diagnostics for 2 agents')).toBeNull();
    });

    it('should show available actions for 2 selected agents if they are active', async () => {
      const selectedAgents: Agent[] = [
        { id: 'agent1', tags: ['oldTag'], active: true },
        { id: 'agent2', active: true },
      ] as Agent[];

      const props = {
        totalAgents: 10,
        totalInactiveAgents: 0,
        selectionMode: 'manual',
        currentQuery: '',
        selectedAgents,
        visibleAgents: [],
        refreshAgents: () => undefined,
        allTags: [],
        agentPolicies: [],
      };
      const results = render(props);

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');

      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Unenroll 2 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 2 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeDisabled();
    });

    it('should add actions if mockedExperimentalFeaturesService is enabled', async () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        diagnosticFileUploadEnabled: true,
      } as any);

      const selectedAgents: Agent[] = [
        { id: 'agent1', tags: ['oldTag'], active: true },
        { id: 'agent2', active: true },
      ] as Agent[];

      const props = {
        totalAgents: 10,
        totalInactiveAgents: 0,
        selectionMode: 'manual',
        currentQuery: '',
        selectedAgents,
        visibleAgents: [],
        refreshAgents: () => undefined,
        allTags: [],
        agentPolicies: [],
        unselectableAgents: [],
      };
      const results = render(props);

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');

      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(
        results.getByText('Request diagnostics for 2 agents').closest('button')!
      ).toBeEnabled();
    });
  });

  describe('When in query mode', () => {
    it('should show correct actions for the active agents', async () => {
      mockedSendGetAgentPolicies.mockResolvedValue({
        data: {
          items: [
            {
              name: 'Managed agent policy',
              namespace: 'default',
              description: '',
              monitoring_enabled: ['logs', 'metrics'],
              is_managed: true,
              id: 'test-managed-policy',
            },
          ],
        },
      });
      mockedSendGetAgents.mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          totalInactive: 0,
        },
      });
      const selectedAgents: Agent[] = [];

      const props = {
        totalAgents: 10,
        totalInactiveAgents: 0,
        selectionMode: 'query',
        currentQuery: '(Base query)',
        selectedAgents,
        visibleAgents: [],
        refreshAgents: () => undefined,
        allTags: [],
        agentPolicies: [],
      };
      const results = render(props);

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');

      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Unenroll 10 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 10 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 10 agents').closest('button')!).toBeDisabled();
      expect(
        results.getByText('Request diagnostics for 10 agents').closest('button')!
      ).toBeEnabled();
    });

    it('should show correct actions for the active agents and exclude the managed agents from the count', async () => {
      const selectedAgents: Agent[] = [];
      mockedSendGetAgentPolicies.mockResolvedValue({
        data: {
          items: [
            {
              name: 'Managed agent policy',
              namespace: 'default',
              description: '',
              monitoring_enabled: ['logs', 'metrics'],
              is_managed: true,
              id: 'test-managed-policy',
            },
          ],
        },
      });
      mockedSendGetAgents.mockResolvedValueOnce({
        data: {
          items: ['agentId1', 'agentId2'],
          total: 2,
          totalInactive: 0,
        },
      });

      const props = {
        totalAgents: 10,
        totalInactiveAgents: 0,
        selectionMode: 'query',
        currentQuery: '(Base query)',
        selectedAgents,
        visibleAgents: [],
        refreshAgents: () => undefined,
        allTags: [],
        agentPolicies: [],
      };
      const results = render(props);

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');

      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Unenroll 8 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 8 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 8 agents').closest('button')!).toBeDisabled();
      expect(
        results.getByText('Request diagnostics for 8 agents').closest('button')!
      ).toBeEnabled();
    });
  });
});
