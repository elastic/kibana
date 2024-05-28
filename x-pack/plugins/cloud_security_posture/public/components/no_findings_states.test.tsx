/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupMockServer, startMockServer } from '../test/mock_server/mock_server';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { NoFindingsStates } from './no_findings_states';
import { renderWrapper } from '../test/mock_server/mock_server_test_provider';
import {
  statusIndexing,
  statusIndexTimeout,
  statusNotDeployed,
  statusNotInstalled,
  statusUnprivileged,
} from '../test/mock_server/handlers/internal/cloud_security_posture/status_handlers';
import { PostureTypes } from '../../common/types_old';

const server = setupMockServer();

const renderNoFindingsStates = (postureType: PostureTypes = 'cspm') => {
  return renderWrapper(<NoFindingsStates postureType={postureType} />);
};

describe('NoFindingsStates', () => {
  startMockServer(server);

  it('shows integrations installation prompt when integration is not-installed', async () => {
    server.use(statusNotInstalled);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /detect security misconfigurations in your cloud infrastructure!/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText('Add CSPM Integration')).toBeInTheDocument();
      expect(screen.getByText('Add KSPM Integration')).toBeInTheDocument();
    });
  });
  it('shows install agent prompt when status is not-deployed', async () => {
    server.use(statusNotDeployed);
    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /no agents installed/i,
        })
      ).toBeInTheDocument();
    });

    // Loading state
    expect(
      screen.getByRole('button', {
        name: /install agent/i,
      })
    ).toBeDisabled();

    await waitFor(() => {
      const link = screen.getByRole('link', {
        name: /install agent/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/app/integrations/detail/cloud_security_posture-1.9.0/policies?addAgentToPolicyId=1f850b02-c6db-4378-9323-d439db4d65b4&integration=9b69ad21-1451-462c-9cd7-cc7dee50a34e'
      );
    });
  });
  it('shows indexing message when status is indexing', async () => {
    server.use(statusIndexing);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /posture evaluation underway/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /waiting for data to be collected and indexed. check back later to see your findings/i
        )
      ).toBeInTheDocument();
    });
  });
  it('shows timeout message when status is index-timeout', async () => {
    server.use(statusIndexTimeout);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      screen.getByRole('heading', {
        name: /waiting for findings data/i,
      });
      expect(
        screen.getByText(/collecting findings is taking longer than expected/i)
      ).toBeInTheDocument();
    });
  });
  it('shows unprivileged message when status is unprivileged', async () => {
    server.use(statusUnprivileged);

    renderNoFindingsStates();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /privileges required/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /to view cloud posture data, you must update privileges\. for more information, contact your kibana administrator\./i
        )
      ).toBeInTheDocument();
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
});
