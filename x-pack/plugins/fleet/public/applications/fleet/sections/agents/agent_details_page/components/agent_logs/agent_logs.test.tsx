/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { useConfig } from '../../../../../hooks';

import { AgentLogsUI } from './agent_logs';

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  return {
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

jest.mock('@kbn/kibana-react-plugin/public', () => {
  return {
    RedirectAppLinks: ({ children }: { children: any }) => <div>{children}</div>,
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
    useConfig: jest.fn(),
    useLink: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
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
      http: {
        basePath: {
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
    }),
  };
});

const mockUseConfig = useConfig as jest.Mock;

describe('AgentLogsUI', () => {
  const renderComponent = () => {
    const agent = {
      id: 'agent1',
      local_metadata: { elastic: { agent: { version: '8.11' } } },
    } as any;
    const state = {
      datasets: ['elastic_agent'],
      logLevels: ['info', 'error'],
      query: '',
    } as any;
    return render(<AgentLogsUI agent={agent} state={state} />);
  };

  it('should render Open in Logs UI if capabilities not set', () => {
    mockUseConfig.mockReturnValue({
      internal: {},
    });
    const result = renderComponent();
    expect(result.getByTestId('viewInLogsBtn')).not.toBeNull();
  });

  it('should render Open in Discover if capabilities set', () => {
    mockUseConfig.mockReturnValue({
      internal: {
        registry: {
          capabilities: ['security'],
        },
      },
    });
    const result = renderComponent();
    const viewInDiscover = result.getByTestId('viewInDiscoverBtn');
    expect(viewInDiscover).toHaveAttribute(
      'href',
      `http://localhost:5620/app/discover#/?_a=(index:'logs-*',query:(language:kuery,query:'data_stream.dataset:elastic_agent%20AND%20elastic_agent.id:agent1'))`
    );
  });
});
