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

jest.mock('../../../../../../../hooks/use_authz');

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
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentLogsUI', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
      },
    } as any);
  });
  const renderComponent = () => {
    const renderer = createFleetTestRendererMock();
    const agent = {
      id: 'agent1',
      local_metadata: { elastic: { agent: { version: '8.11' } } },
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
      http: {
        basePath: {
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
      cloud: {
        isServerlessEnabled,
      },
    });
  };

  it('should render Open in Logs UI if capabilities not set', () => {
    mockStartServices();
    const result = renderComponent();
    expect(result.getByTestId('viewInLogsBtn')).toHaveAttribute(
      'href',
      `http://localhost:5620/app/logs/stream?logPosition=(end%3A'2023-20-04T14%3A20%3A00.340Z'%2Cstart%3A'2023-20-04T14%3A00%3A00.340Z'%2CstreamLive%3A!f)&logFilter=(expression%3A'elastic_agent.id%3Aagent1%20and%20(data_stream.dataset%3Aelastic_agent)%20and%20(log.level%3Ainfo%20or%20log.level%3Aerror)'%2Ckind%3Akuery)`
    );
  });

  it('should render Open in Discover if serverless enabled', () => {
    mockStartServices(true);
    const result = renderComponent();
    const viewInDiscover = result.getByTestId('viewInDiscoverBtn');
    expect(viewInDiscover).toHaveAttribute(
      'href',
      `http://localhost:5620/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'2023-20-04T14:00:00.340Z',to:'2023-20-04T14:20:00.340Z'))&_a=(columns:!(event.dataset,message),index:'logs-*',query:(language:kuery,query:'elastic_agent.id:agent1 and (data_stream.dataset:elastic_agent) and (log.level:info or log.level:error)'))`
    );
  });
});
