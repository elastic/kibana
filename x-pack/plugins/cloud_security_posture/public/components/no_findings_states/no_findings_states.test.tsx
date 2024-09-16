/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { setupMockServer, startMockServer } from '../../test/mock_server/mock_server';
import { renderWrapper } from '../../test/mock_server/mock_server_test_provider';
import { NoFindingsStates } from './no_findings_states';
import * as statusHandlers from '../../../server/routes/status/status.handlers.mock';
import * as benchmarksHandlers from '../../../server/routes/benchmarks/benchmarks.handlers.mock';
import {
  PACKAGE_NOT_INSTALLED_TEST_SUBJECT,
  THIRD_PARTY_INTEGRATIONS_NO_FINDINGS_PROMPT,
} from '../cloud_posture_page';

const server = setupMockServer();

const renderNoFindingsStates = (postureType: 'cspm' | 'kspm' = 'cspm') => {
  return renderWrapper(<NoFindingsStates postureType={postureType} />);
};

describe('NoFindingsStates', () => {
  startMockServer(server);

  it('shows integrations installation prompt with installation links when integration is not-installed', async () => {
    server.use(statusHandlers.notInstalledHandler);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId(THIRD_PARTY_INTEGRATIONS_NO_FINDINGS_PROMPT)).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /wiz integration/i })).toHaveAttribute(
        'href',
        '/app/integrations/detail/wiz/overview'
      );
    });
  });

  it('shows install agent prompt with install agent link when status is not-deployed', async () => {
    server.use(statusHandlers.notDeployedHandler);
    server.use(benchmarksHandlers.cspmInstalledHandler);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no agents installed/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /install agent/i })).toHaveAttribute(
        'href',
        '/app/integrations/detail/cloud_security_posture-1.9.0/policies?addAgentToPolicyId=30cba674-531c-4225-b392-3f7810957511&integration=630f3e42-659e-4499-9007-61e36adf1d97'
      );
    });
  });

  it('shows install agent prompt with install agent link when status is not-deployed and postureType is KSPM', async () => {
    server.use(statusHandlers.notDeployedHandler);
    server.use(benchmarksHandlers.kspmInstalledHandler);
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
        '/app/integrations/detail/cloud_security_posture-1.9.0/policies?addAgentToPolicyId=e2f72eea-bf76-4576-bed8-e29d2df102a7&integration=6aedf856-bc21-49aa-859a-a0952789f898'
      );
    });
  });

  it('shows indexing message when status is indexing', async () => {
    server.use(statusHandlers.indexingHandler);

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
    server.use(statusHandlers.indexTimeoutHandler);

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
    server.use(statusHandlers.unprivilegedHandler);

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
    server.use(statusHandlers.indexedHandler);

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
