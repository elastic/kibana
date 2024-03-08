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
import { AgentReassignAgentPolicyModal } from '../../components/agent_reassign_policy_modal';

import { AgentBulkActions } from './bulk_actions';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
}));

jest.mock('../../components/agent_reassign_policy_modal');

const defaultProps = {
  shownAgents: 10,
  inactiveShownAgents: 0,
  totalManagedAgentIds: [],
  inactiveManagedAgentIds: [],
  selectionMode: 'manual',
  currentQuery: '',
  selectedAgents: [],
  visibleAgents: [],
  refreshAgents: () => undefined,
  allTags: [],
  agentPolicies: [],
};

describe('AgentBulkActions', () => {
  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      diagnosticFileUploadEnabled: false,
    } as any);
  });

  beforeEach(() => {
    jest.mocked(AgentReassignAgentPolicyModal).mockReset();
    jest.mocked(AgentReassignAgentPolicyModal).mockReturnValue(null);
  });

  function render(props: any) {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<AgentBulkActions {...props} />);
  }

  describe('When in manual mode', () => {
    it('should show only disabled actions if no agents are active', async () => {
      const results = render({
        ...defaultProps,
        inactiveShownAgents: 10,
        selectedAgents: [{ id: 'agent1' }, { id: 'agent2' }] as Agent[],
      });

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
      expect(results.getByText('Restart upgrade 2 agents').closest('button')!).toBeDisabled();
    });

    it('should show available actions for 2 selected agents if they are active', async () => {
      const results = render({
        ...defaultProps,
        selectedAgents: [
          { id: 'agent1', tags: ['oldTag'], active: true },
          { id: 'agent2', active: true },
        ] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Unenroll 2 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 2 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Restart upgrade 2 agents').closest('button')!).toBeEnabled();
    });

    it('should add actions if mockedExperimentalFeaturesService is enabled', async () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        diagnosticFileUploadEnabled: true,
      } as any);

      const results = render({
        ...defaultProps,
        selectedAgents: [
          { id: 'agent1', tags: ['oldTag'], active: true },
          { id: 'agent2', active: true },
        ] as Agent[],
      });

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
    mockedExperimentalFeaturesService.get.mockReturnValue({
      diagnosticFileUploadEnabled: true,
    } as any);

    it('should show correct actions for active agents when no managed policies exist', async () => {
      const results = render({
        ...defaultProps,
        selectionMode: 'query',
      });

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
      expect(results.getByText('Restart upgrade 10 agents').closest('button')!).toBeEnabled();
    });

    it('should show correct actions for the active agents and exclude the managed agents from the count', async () => {
      const results = render({
        ...defaultProps,
        totalManagedAgentIds: ['agentId1', 'agentId2'],
        selectionMode: 'query',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(
        results.getByText('Request diagnostics for 8 agents').closest('button')!
      ).toBeEnabled();
      expect(results.getByText('Unenroll 8 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 8 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 8 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Restart upgrade 8 agents').closest('button')!).toBeEnabled();
    });

    it('should show correct actions also when there are inactive managed agents', async () => {
      const results = render({
        ...defaultProps,
        inactiveManagedAgentIds: ['agentId1', 'agentId2'],
        totalManagedAgentIds: ['agentId1', 'agentId2', 'agentId3'],
        selectionMode: 'query',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Unenroll 9 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 9 agents').closest('button')!).toBeEnabled();
      expect(results.getByText('Schedule upgrade for 9 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Restart upgrade 9 agents').closest('button')!).toBeEnabled();
    });

    it('should show disabled actions when only inactive agents are selected', async () => {
      const results = render({
        ...defaultProps,
        inactiveShownAgents: 10,
        selectedAgents: [{ id: 'agent1' }, { id: 'agent2' }] as Agent[],
        selectionMode: 'query',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Add / remove tags').closest('button')!).toBeDisabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeDisabled();
      expect(results.getByText('Unenroll 0 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Upgrade 0 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Schedule upgrade for 0 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Restart upgrade 0 agents').closest('button')!).toBeDisabled();
    });

    it('should generate a correct kuery to select agents', async () => {
      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      await act(async () => {
        fireEvent.click(results.getByText('Assign to new policy').closest('button')!);
      });

      expect(jest.mocked(AgentReassignAgentPolicyModal)).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: '(Base query)',
        }),
        expect.anything()
      );
    });

    it('should generate a correct kuery to select agents with managed agents too', async () => {
      const results = render({
        ...defaultProps,
        totalManagedAgentIds: ['agentId1', 'agentId2'],
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      await act(async () => {
        fireEvent.click(results.getByText('Assign to new policy').closest('button')!);
      });

      expect(jest.mocked(AgentReassignAgentPolicyModal)).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: '(Base query) AND NOT (fleet-agents.agent.id : ("agentId1" or "agentId2"))',
        }),
        expect.anything()
      );
    });
  });
});
