/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TestProvider } from '../test/test_provider';
import { NoFindingsStates } from './no_findings_states';
import {
  cspmStatusNotInstalled,
  cspmStatusCspmNotDeployed,
} from '../test/handlers/cspmStatusHandlers';
import { getMockServerCoreSetup, setupMockServiceWorker } from '../test/mockServer';

const server = setupMockServiceWorker();

const renderWrapper = (children: React.ReactNode) => {
  const core = getMockServerCoreSetup();
  return render(<TestProvider core={core}>{children}</TestProvider>);
};

describe('NoFindingsStates', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'warn',
    })
  );
  beforeEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  describe('Posture Type CSPM', () => {
    it('renders the not-installed component', async () => {
      server.use(cspmStatusNotInstalled);

      const { getByText } = renderWrapper(<NoFindingsStates postureType="cspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('Add CSPM Integration')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Add KSPM Integration')).toBeInTheDocument());
    });
    it('renders the not-deployed component', async () => {
      server.use(
        // override the initial "GET /status" request handler
        cspmStatusCspmNotDeployed
      );
      const { getByText } = renderWrapper(<NoFindingsStates postureType="cspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('No Agents Installed')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Install Agent')).toBeInTheDocument());
    });
  });
  describe('Posture Type KSPM', () => {
    it('renders the not-installed component', async () => {
      server.use(cspmStatusNotInstalled);
      const { getByText } = renderWrapper(<NoFindingsStates postureType="kspm" />);
      await expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('Add CSPM Integration')).toBeInTheDocument());
      await waitFor(() => expect(getByText('Add KSPM Integration')).toBeInTheDocument());
    });
  });
});
