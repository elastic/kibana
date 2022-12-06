/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { OsqueryAction } from '.';
import { queryClient } from '../../query_client';
import * as hooks from '../use_is_osquery_available';
import { useKibana } from '../../common/lib/kibana';
import { AGENT_STATUS_ERROR, EMPTY_PROMPT, NOT_AVAILABLE, PERMISSION_DENIED } from './translations';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const defaultUseOsqueryAvailableResult = {
  osqueryAvailable: true,
  agentFetched: true,
  isLoading: false,
  policyFetched: true,
  policyLoading: false,
};

const spyUseIsOsqueryAvailable = jest
  .spyOn(hooks, 'useIsOsqueryAvailable')
  .mockImplementation(() => ({
    ...defaultUseOsqueryAvailableResult,
    agentData: {},
  }));

const defaultPermissions = {
  osquery: {
    runSavedQueries: false,
    readSavedQueries: false,
  },
};

const mockKibana = (permissionType: unknown = defaultPermissions) => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: permissionType,
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const spyOsquery = (data: Record<string, unknown> = {}) => {
  spyUseIsOsqueryAvailable.mockImplementation(() => ({
    ...defaultUseOsqueryAvailableResult,
    ...data,
  }));
};

const properPermissions = {
  osquery: {
    runSavedQueries: true,
    writeLiveQueries: true,
  },
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <IntlProvider locale={'en'}>
      <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
    </IntlProvider>
  );

describe('Osquery Action', () => {
  it('should return empty prompt when agentFetched and no agentData', async () => {
    spyOsquery();
    mockKibana();

    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(EMPTY_PROMPT)).toBeInTheDocument();
  });
  it('should return permission denied when agentFetched and agentData available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana();

    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return agent status error when permissions are ok and agent status is wrong', async () => {
    spyOsquery({ agentData: {} });
    mockKibana(properPermissions);
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(AGENT_STATUS_ERROR)).toBeInTheDocument();
  });
  it('should return permission denied if just one permission (runSavedQueries) is available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        runSavedQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return permission denied if just one permission (readSavedQueries) is available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        readSavedQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return permission denied if no writeLiveQueries', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(AGENT_STATUS_ERROR)).toBeInTheDocument();
  });
  it('should return not available prompt if osquery is not available', async () => {
    spyOsquery({ agentData: {}, osqueryAvailable: false });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(NOT_AVAILABLE)).toBeInTheDocument();
  });
  it('should not return any errors when all data is ok', async () => {
    spyOsquery({ agentData: { status: 'online' } });
    mockKibana(properPermissions);

    const { queryByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} />
    );
    expect(queryByText(EMPTY_PROMPT)).not.toBeInTheDocument();
    expect(queryByText(PERMISSION_DENIED)).not.toBeInTheDocument();
    expect(queryByText(AGENT_STATUS_ERROR)).not.toBeInTheDocument();
  });
});
