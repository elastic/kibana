/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostBulkAgentUpgrade } from '../../../../hooks';

import { AgentUpgradeAgentModal } from '.';
import type { AgentUpgradeAgentModalProps } from '.';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    sendGetAgentsAvailableVersions: jest.fn().mockResolvedValue({
      data: {
        items: ['8.10.2', '8.7.0'],
      },
    }),
    sendGetAgentStatus: jest.fn().mockResolvedValue({
      data: { results: { updating: 2 } },
    }),
    sendPostBulkAgentUpgrade: jest.fn(),
    useAgentVersion: jest.fn().mockReturnValue('8.10.2'),
  };
});

const mockSendPostBulkAgentUpgrade = sendPostBulkAgentUpgrade as jest.Mock;

function renderAgentUpgradeAgentModal(props: Partial<AgentUpgradeAgentModalProps>) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <AgentUpgradeAgentModal agents="" agentCount={12} onClose={() => {}} {...props} />
  );

  return { utils };
}

describe('AgentUpgradeAgentModal', () => {
  it('should set the default to Immediately if there is less than 10 agents using kuery', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: '*',
      agentCount: 3,
    });

    const el = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
    expect(el?.textContent).toBe('Immediately');
  });

  it('should set the default to Immediately if there is less than 10 agents using selected agents', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [{ id: 'agent1' }, { id: 'agent2' }] as any,
      agentCount: 3,
    });

    const el = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
    expect(el?.textContent).toBe('Immediately');
  });

  it('should set the default to 1 hour if there is more than 10 agents', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: '*',
      agentCount: 13,
    });

    const el = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
    expect(el?.textContent).toBe('1 hour');
  });

  it('should enable the version combo if agents is a query', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: '*',
      agentCount: 30,
    });

    const el = utils.getByTestId('agentUpgradeModal.VersionCombobox');
    await waitFor(() => {
      expect(el.classList.contains('euiComboBox-isDisabled')).toBe(false);
    });
  });

  it('should default the version combo to latest agent version', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [{ id: 'agent1', local_metadata: { host: 'abc' } }] as any,
      agentCount: 1,
    });

    const el = utils.getByTestId('agentUpgradeModal.VersionCombobox');
    await waitFor(() => {
      expect(el.textContent).toEqual('8.10.2');
    });
  });

  it('should restart uprade on updating agents if some agents in updating', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [
        { status: 'updating', upgrade_started_at: '2022-11-21T12:27:24Z', id: 'agent1' },
        { id: 'agent2' },
      ] as any,
      agentCount: 2,
      isUpdating: true,
    });

    const el = utils.getByTestId('confirmModalTitleText');
    expect(el.textContent).toEqual('Restart upgrade on 1 out of 2 agents stuck in updating');

    const btn = utils.getByTestId('confirmModalConfirmButton');
    await waitFor(() => {
      expect(btn).toBeEnabled();
    });

    act(() => {
      fireEvent.click(btn);
    });

    expect(mockSendPostBulkAgentUpgrade.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ agents: ['agent1'], force: true })
    );
  });

  it('should restart upgrade on updating agents if kuery', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: '*',
      agentCount: 3,
      isUpdating: true,
    });

    const el = await utils.findByTestId('confirmModalTitleText');
    expect(el.textContent).toEqual('Restart upgrade on 2 out of 3 agents stuck in updating');

    const btn = utils.getByTestId('confirmModalConfirmButton');
    await waitFor(() => {
      expect(btn).toBeEnabled();
    });

    act(() => {
      fireEvent.click(btn);
    });

    expect(mockSendPostBulkAgentUpgrade.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        agents:
          '(*) AND status:updating AND upgrade_started_at:* AND NOT upgraded_at:* AND upgrade_started_at < now-2h',
        force: true,
      })
    );
  });

  it('should disable submit button if no agents stuck updating', () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [
        { status: 'offline', upgrade_started_at: '2022-11-21T12:27:24Z', id: 'agent1' },
        { id: 'agent2' },
      ] as any,
      agentCount: 2,
      isUpdating: true,
    });

    const el = utils.getByTestId('confirmModalConfirmButton');
    expect(el).toBeDisabled();
  });
});
