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
import type { LicenseService } from '../../../../services';
import { ExperimentalFeaturesService } from '../../../../services';
import { AgentReassignAgentPolicyModal } from '../../components/agent_reassign_policy_modal';

import { useLicense } from '../../../../../../hooks/use_license';

import { AgentBulkActions } from './bulk_actions';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../../../hooks/use_license');
const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

jest.mock('../../components/agent_reassign_policy_modal');

jest.mock('../hooks/export_csv', () => ({
  useExportCSV: jest.fn().mockReturnValue({
    generateReportingJobCSV: jest.fn(),
  }),
}));

const defaultProps = {
  nAgentsInTable: 10,
  totalManagedAgentIds: [],
  selectionMode: 'manual',
  currentQuery: '',
  selectedAgents: [],
  agentsOnCurrentPage: [],
  refreshAgents: () => undefined,
  allTags: [],
  agentPolicies: [],
};

describe('AgentBulkActions', () => {
  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      diagnosticFileUploadEnabled: true,
    } as any);
  });

  beforeEach(() => {
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => false,
    } as unknown as LicenseService);
    jest.mocked(AgentReassignAgentPolicyModal).mockReset();
    jest.mocked(AgentReassignAgentPolicyModal).mockReturnValue(null);
  });

  function render(props: any) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<AgentBulkActions {...props} />);
  }

  describe('When in manual selection mode', () => {
    it('should show the available actions for the selected agents', async () => {
      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[],
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
      expect(
        results.getByText('Request diagnostics for 2 agents').closest('button')!
      ).toBeEnabled();
    });

    it('should allow scheduled upgrades if the license allows it', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: () => true,
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeEnabled();
    });
  });

  describe('When in query selection mode', () => {
    it('should show the available actions for all agents when no managed agents are listed', async () => {
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

    it('should show the available actions for all agents except managed agents', async () => {
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

    it('should generate a correct kuery to select agents when no managed agents are listed', async () => {
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

    it('should generate a correct kuery that excludes managed agents', async () => {
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
          agents: '((Base query)) AND NOT (fleet-agents.agent.id : ("agentId1" or "agentId2"))',
        }),
        expect.anything()
      );
    });
  });
});
