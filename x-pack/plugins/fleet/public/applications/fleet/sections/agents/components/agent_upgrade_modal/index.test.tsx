/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { AgentUpgradeAgentModal } from '.';
import type { AgentUpgradeAgentModalProps } from '.';

jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
}));

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiConfirmModal: ({ children }: any) => <>{children}</>,
  };
});

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

    const el = utils.container.querySelector(
      '[data-test-subj="agentUpgradeModal.MaintenanceCombobox"]'
    );
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('Immediately');
  });

  it('should set the default to Immediately if there is less than 10 agents using selected agents', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [{ id: 'agent1' }, { id: 'agent2' }] as any,
      agentCount: 3,
    });

    const el = utils.container.querySelector(
      '[data-test-subj="agentUpgradeModal.MaintenanceCombobox"]'
    );
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('Immediately');
  });

  it('should set the default to 1 hour if there is more than 10 agents', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: '*',
      agentCount: 13,
    });

    const el = utils.container.querySelector(
      '[data-test-subj="agentUpgradeModal.MaintenanceCombobox"]'
    );

    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('1 hour');
  });
});
