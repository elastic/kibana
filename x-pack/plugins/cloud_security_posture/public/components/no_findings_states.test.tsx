/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { setupMockServer, startMockServer } from '../test/mock_server/mock_server';
import { renderWrapper } from '../test/mock_server/mock_server_test_provider';
import { NoFindingsStates } from './no_findings_states';
import {
  statusIndexing,
  statusIndexTimeout,
  statusNotDeployed,
  statusNotInstalled,
  statusUnprivileged,
  statusIndexed,
} from '../test/mock_server/handlers/internal/cloud_security_posture/status_handlers';

const server = setupMockServer();

const renderNoFindingsStates = (postureType: 'cspm' | 'kspm' = 'cspm') => {
  return renderWrapper(<NoFindingsStates postureType={postureType} />);
};

describe('NoFindingsStates', () => {
  startMockServer(server);

  it('shows integrations installation prompt with installation links when integration is not-installed', async () => {
    server.use(statusNotInstalled);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/detect security misconfigurations in your cloud infrastructure!/i)
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /add cspm integration/i })).toHaveAttribute(
        'href',
        '/app/fleet/integrations/cloud_security_posture-1.9.0/add-integration/cspm'
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /add kspm integration/i })).toHaveAttribute(
        'href',
        '/app/fleet/integrations/cloud_security_posture-1.9.0/add-integration/kspm'
      );
    });
  });
  it('shows install agent prompt with install agent link when status is not-deployed', async () => {
    server.use(statusNotDeployed);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no agents installed/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /install agent/i })).toHaveAttribute(
        'href',
        '/app/integrations/detail/cloud_security_posture-1.9.0/policies?addAgentToPolicyId=1f850b02-c6db-4378-9323-d439db4d65b4&integration=9b69ad21-1451-462c-9cd7-cc7dee50a34e'
      );
    });
  });
  it('shows install agent prompt with install agent link when status is not-deployed and postureType is KSPM', async () => {
    server.use(statusNotDeployed);
    renderNoFindingsStates('kspm');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no agents installed/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const link = screen.getByRole('link', {
        name: /install agent/i,
      });
      expect(link).toHaveAttribute(
        'href',
        '/app/integrations/detail/cloud_security_posture-1.9.0/policies?addAgentToPolicyId=689ca301-cf52-4251-b427-85817fa53800&integration=c14da36e-8476-455f-a8a8-127013a4ccee'
      );
    });
  });
  it('shows indexing message when status is indexing', async () => {
    server.use(statusIndexing);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/posture evaluation underway/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /waiting for data to be collected and indexed. check back later to see your findings/i
      )
    ).toBeInTheDocument();
  });
  it('shows timeout message when status is index-timeout', async () => {
    server.use(statusIndexTimeout);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      screen.getByRole('heading', {
        name: /waiting for findings data/i,
      });
    });

    expect(
      screen.getByText(/collecting findings is taking longer than expected/i)
    ).toBeInTheDocument();
  });
  it('shows unprivileged message when status is unprivileged', async () => {
    server.use(statusUnprivileged);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/privileges required/i)).toBeInTheDocument();

      expect(
        screen.getByText(/required elasticsearch index privilege for the following indices:/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText('logs-cloud_security_posture.findings_latest-default')
      ).toBeInTheDocument();
      expect(screen.getByText('logs-cloud_security_posture.findings-default*')).toBeInTheDocument();
      expect(screen.getByText('logs-cloud_security_posture.scores-default')).toBeInTheDocument();
      expect(
        screen.getByText('logs-cloud_security_posture.vulnerabilities_latest-default')
      ).toBeInTheDocument();
    });
  });
  it('renders empty container when the status does not match a no finding status', async () => {
    server.use(statusIndexed);

    const { container } = renderNoFindingsStates();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          class="euiFlexGroup emotion-euiFlexGroup-l-center-center-column"
        />
      </div>
    `);
  });
});
