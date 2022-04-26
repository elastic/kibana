/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { render } from '@testing-library/react';
import { OsqueryAction } from '.';
import { queryClient } from '../../query_client';
import { QueryClientProvider } from 'react-query';
import * as hooks from './use_is_osquery_available';
import { useKibana } from '../../common/lib/kibana';

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
      <KibanaReactContext.Provider>
        <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
      </KibanaReactContext.Provider>
    </IntlProvider>
  );

// const MY_BASE_PATH = 'my-base-path';
const KibanaReactContext = createKibanaReactContext(
  coreMock.createStart({ basePath: 'my-base-path' })
);

const emptyPrompt =
  'An Elastic Agent is not installed on this host. To run queries, install Elastic Agent on the host, and then add the Osquery Manager integration to the agent policy in Fleet.';
const permissionDenied = 'Permission denied';
const osqueryNotAvailable =
  'The Osquery Manager integration is not added to the agent policy. To run queries on the host, add the Osquery Manager integration to the agent policy in Fleet.';
const agentStatusError =
  'To run queries on this host, the Elastic Agent must be active. Check the status of this agent in Fleet.';

describe('Osquery Action', () => {
  it('should return empty prompt when agentFetched and no agentData', async () => {
    spyOsquery();
    mockKibana();

    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(emptyPrompt)).toBeInTheDocument();
  });
  it('should return empty prompt when no agentId', async () => {
    spyOsquery();
    mockKibana();

    const { getByText } = renderWithContext(
      <OsqueryAction agentId={''} formType={'steps'} isExternal={true} />
    );
    expect(getByText(emptyPrompt)).toBeInTheDocument();
  });
  it('should return permission denied when agentFetched and agentData available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana();

    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(permissionDenied)).toBeInTheDocument();
  });
  it('should run agent status error when permissions are ok and agent status is wrong', async () => {
    spyOsquery({ agentData: {} });
    mockKibana(properPermissions);
    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(agentStatusError)).toBeInTheDocument();
  });
  it('should run permission denied if just one permission is available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        runSavedQueries: true,
      },
    });
    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(permissionDenied)).toBeInTheDocument();
  });
  it('should run permission denied if no writeLiveQueries', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(agentStatusError)).toBeInTheDocument();
  });
  it('should if osquery is not available', async () => {
    spyOsquery({ agentData: {}, osqueryAvailable: false });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(getByText(osqueryNotAvailable)).toBeInTheDocument();
  });
  it('should return agent status is wrong', async () => {
    spyOsquery({ agentData: { status: 'online' } });
    mockKibana(properPermissions);

    const { queryByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} isExternal={true} />
    );
    expect(queryByText(emptyPrompt)).not.toBeInTheDocument();
    expect(queryByText(permissionDenied)).not.toBeInTheDocument();
    expect(queryByText(agentStatusError)).not.toBeInTheDocument();
  });
});
