/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../../../common/types';

import { useStartServices } from '../../../../hooks';

import { ViewErrors } from './view_errors';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useLink: jest.fn(),
    useStartServices: jest.fn(),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

jest.mock('@kbn/shared-ux-link-redirect-app', () => ({
  RedirectAppLinks: (props: any) => {
    return <div>{props.children}</div>;
  },
}));

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

describe('ViewErrors', () => {
  const renderComponent = (action: ActionStatus) => {
    return render(
      <I18nProvider>
        <ViewErrors action={action} />
      </I18nProvider>
    );
  };

  it('should render error message with btn to Logs view if serverless not enabled', () => {
    mockStartServices();
    const result = renderComponent({
      actionId: 'action1',
      latestErrors: [
        {
          agentId: 'agent1',
          error: 'Agent agent1 is not upgradeable',
          timestamp: '2023-03-06T14:51:24.709Z',
        },
      ],
    } as any);

    const errorText = result.getByTestId('errorText');
    expect(errorText.textContent).toEqual('Agent agent1 is not upgradeable');

    const viewErrorBtn = result.getByTestId('viewInLogsBtn');
    expect(viewErrorBtn.getAttribute('href')).toEqual(
      `http://localhost:5620/app/logs/stream?logPosition=(end%3A'2023-03-06T14%3A56%3A24.709Z'%2Cstart%3A'2023-03-06T14%3A46%3A24.709Z'%2CstreamLive%3A!f)&logFilter=(expression%3A'elastic_agent.id%3Aagent1%20and%20(data_stream.dataset%3Aelastic_agent)%20and%20(log.level%3Aerror)'%2Ckind%3Akuery)`
    );
  });

  it('should render error message with btn to Discover view if serverless enabled', () => {
    mockStartServices(true);
    const result = renderComponent({
      actionId: 'action1',
      latestErrors: [
        {
          agentId: 'agent1',
          error: 'Agent agent1 is not upgradeable',
          timestamp: '2023-03-06T14:51:24.709Z',
        },
      ],
    } as any);

    const errorText = result.getByTestId('errorText');
    expect(errorText.textContent).toEqual('Agent agent1 is not upgradeable');

    const viewErrorBtn = result.getByTestId('viewInDiscoverBtn');
    expect(viewErrorBtn.getAttribute('href')).toEqual(
      `http://localhost:5620/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'2023-03-06T14:46:24.709Z',to:'2023-03-06T14:56:24.709Z'))&_a=(columns:!(event.dataset,message),index:'logs-*',query:(language:kuery,query:'elastic_agent.id:agent1 and (data_stream.dataset:elastic_agent) and (log.level:error)'))`
    );
  });
});
