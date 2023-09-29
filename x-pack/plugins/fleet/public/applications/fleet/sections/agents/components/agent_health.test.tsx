/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import type { Agent } from '../../../types';

import { AgentHealth } from './agent_health';

jest.mock('./agent_upgrade_modal', () => {
  return {
    AgentUpgradeAgentModal: () => <>Upgrade Modal</>,
  };
});

function renderAgentHealth(agent: Agent, fromDetails?: boolean) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<AgentHealth agent={agent} fromDetails={fromDetails} />);

  return { utils };
}

describe('AgentHealth', () => {
  it('should render agent health with callout when agent stuck updating', () => {
    const { utils } = renderAgentHealth(
      {
        active: true,
        status: 'updating',
        upgrade_started_at: '2022-11-21T12:27:24Z',
      } as any,
      true
    );

    act(() => {
      fireEvent.click(utils.getByTestId('restartUpgradeBtn'));
    });

    utils.findByText('Upgrade Modal');
  });

  it('should not render agent health with callout when agent not stuck updating', () => {
    const { utils } = renderAgentHealth(
      {
        active: true,
        status: 'updating',
        upgrade_started_at: new Date().toISOString(),
      } as any,
      true
    );

    expect(utils.queryByTestId('restartUpgradeBtn')).not.toBeInTheDocument();
  });

  it('should not render agent health with callout when not from details', () => {
    const { utils } = renderAgentHealth(
      {
        active: true,
        status: 'updating',
        upgrade_started_at: '2022-11-21T12:27:24Z',
      } as any,
      false
    );

    expect(utils.queryByTestId('restartUpgradeBtn')).not.toBeInTheDocument();
    expect(utils.container.querySelector('[data-euiicon-type="warning"]')).not.toBeNull();
  });
});
