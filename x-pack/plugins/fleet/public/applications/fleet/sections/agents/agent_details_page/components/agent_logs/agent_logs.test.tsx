/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';

import { useAuthz, useStartServices } from '../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import { AgentLogsUI } from './agent_logs';

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/kibana-utils-plugin/public'),
    createStateContainerReactHelpers: jest.fn().mockReturnValue({
      useTransitions: jest.fn().mockReturnValue({ update: jest.fn() }),
    }),
  };
});

jest.mock('@kbn/logs-shared-plugin/public', () => {
  return {
    LogStream: () => <div />,
  };
});
jest.mock('@kbn/logs-shared-plugin/common', () => {
  return {
    getLogsLocatorsFromUrlService: jest.fn().mockReturnValue({
      logsLocator: { getRedirectUrl: jest.fn(() => 'https://discover-redirect-url') },
    }),
  };
});

jest.mock('@kbn/shared-ux-link-redirect-app', () => {
  return {
    RedirectAppLinks: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

jest.mock('./query_bar', () => {
  return {
    LogQueryBar: () => <div />,
  };
});

jest.mock('./filter_dataset', () => {
  return {
    DatasetFilter: () => <div />,
  };
});

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useLink: jest.fn(),
    useStartServices: jest.fn(),
    useAuthz: jest.fn(),
    useDiscoverLocator: jest.fn().mockImplementation(() => {
      return {
        id: 'DISCOVER_APP_LOCATOR',
        getRedirectUrl: jest.fn().mockResolvedValue('app/discover/logs/someview'),
      };
    }),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentLogsUI', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
        readAgents: true,
      },
    } as any);
  });
  const renderComponent = (
    opts = {
      agentVersion: '8.11.0',
    }
  ) => {
    const renderer = createFleetTestRendererMock();
    const agent = {
      id: 'agent1',
      local_metadata: { elastic: { agent: { version: opts.agentVersion, log_level: 'debug' } } },
    } as any;
    const state = {
      datasets: ['elastic_agent'],
      logLevels: ['info', 'error'],
      start: '2023-20-04T14:00:00.340Z',
      end: '2023-20-04T14:20:00.340Z',
      query: '',
    } as any;
    return renderer.render(<AgentLogsUI agent={agent} state={state} />);
  };

  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockReturnValue({
      application: {},
      data: {
        query: {
          timefilter: {
            timefilter: {
              calculateBounds: jest.fn().mockReturnValue({
                min: '2023-10-04T13:08:53.340Z',
                max: '2023-10-05T13:08:53.340Z',
              }),
            },
          },
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({
              useUrl: () => 'https://locator.url',
            }),
          },
        },
      },
    });
  };

  it('should render Open in Logs button if privileges are set', () => {
    mockStartServices();
    const result = renderComponent();
    expect(result.getByTestId('viewInLogsBtn')).toHaveAttribute(
      'href',
      `https://discover-redirect-url`
    );
  });

  it('should not render Open in Logs button if privileges are not set', () => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        readAgents: false,
      },
    } as any);
    mockStartServices();
    const result = renderComponent();
    expect(result.queryByTestId('viewInLogsBtn')).not.toBeInTheDocument();
  });

  it('should show log level dropdown with correct value', () => {
    mockStartServices();
    const result = renderComponent();
    const logLevelDropdown = result.getByTestId('selectAgentLogLevel');
    expect(logLevelDropdown.getElementsByTagName('option').length).toBe(4);
    expect(logLevelDropdown).toHaveDisplayValue('debug');
  });

  it('should always show apply log level changes button', () => {
    mockStartServices();
    const result = renderComponent();
    const applyLogLevelBtn = result.getByTestId('applyLogLevelBtn');
    expect(applyLogLevelBtn).toBeInTheDocument();
    expect(applyLogLevelBtn).not.toHaveAttribute('disabled');
  });

  it('should hide reset log level button for agents version < 8.15.0', () => {
    mockStartServices();
    const result = renderComponent();
    const resetLogLevelBtn = result.queryByTestId('resetLogLevelBtn');
    expect(resetLogLevelBtn).not.toBeInTheDocument();
  });

  it('should show reset log level button for agents version >= 8.15.0', () => {
    mockStartServices();
    const result = renderComponent({ agentVersion: '8.15.0' });
    const resetLogLevelBtn = result.getByTestId('resetLogLevelBtn');
    expect(resetLogLevelBtn).toBeInTheDocument();
    expect(resetLogLevelBtn).not.toHaveAttribute('disabled');
  });
});
