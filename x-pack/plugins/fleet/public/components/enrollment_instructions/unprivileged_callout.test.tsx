/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { cleanup, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../mock';

import { UnprivilegedCallout } from './unprivileged_callout';

describe('UnprivilegedCallout', () => {
  function render(
    rootIntegrations?: Array<{ name: string; title: string }>,
    unprivilegedAgentsCount?: number
  ) {
    cleanup();
    const renderer = createFleetTestRendererMock();
    const results = renderer.render(
      <UnprivilegedCallout
        rootIntegrations={rootIntegrations}
        unprivilegedAgentsCount={unprivilegedAgentsCount}
      />
    );

    return results;
  }

  it('should render with no unprivileged agents', async () => {
    const renderResult = render([{ name: 'auditd_manager', title: 'Auditd Manager' }], 0);

    await waitFor(() => {
      expect(renderResult.getByText('Unprivileged agents')).toBeInTheDocument();
      expect(renderResult.getByTestId('unprivilegedAgentsCallout').textContent).toContain(
        'his agent policy has integrations that require Elastic Agents to have root privileges: Auditd Manager. To ensure that all data required by the integration can be collected, enroll agents using an account with root privileges.'
      );
    });
  });

  it('should render with unprivileged agents', async () => {
    const renderResult = render(
      [
        { name: 'auditd_manager', title: 'Auditd Manager' },
        { name: 'endpoint', title: 'Elastic Defend' },
      ],
      3
    );

    await waitFor(() => {
      expect(renderResult.getByText('Unprivileged agents')).toBeInTheDocument();
      expect(renderResult.getByTestId('unprivilegedAgentsCallout').textContent).toContain(
        'This agent policy has integrations that require Elastic Agents to have root privileges: Auditd Manager, Elastic Defend. There are 3 agents running in an unprivileged mode. To ensure that all data required by the integration can be collected, re-enroll the agents using an account with root privileges.'
      );
    });
  });
});
