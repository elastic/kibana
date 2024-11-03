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

import { useStartServices, useAuthz } from '../../../../hooks';

import { ViewErrors } from './view_errors';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
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

jest.mock('@kbn/shared-ux-link-redirect-app', () => ({
  RedirectAppLinks: (props: any) => {
    return <div>{props.children}</div>;
  },
}));

jest.mock('@kbn/logs-shared-plugin/common', () => {
  return {
    getLogsLocatorsFromUrlService: jest.fn().mockReturnValue({
      logsLocator: { getRedirectUrl: jest.fn(() => 'https://discover-redirect-url') },
    }),
  };
});

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

describe('ViewErrors', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
        readAgents: true,
      },
    } as any);
  });
  const renderComponent = (action: ActionStatus) => {
    return render(
      <I18nProvider>
        <ViewErrors action={action} />
      </I18nProvider>
    );
  };

  it('should render error message with btn to Logs view', () => {
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
  });

  it('should render open in Logs button if correct privileges are set', () => {
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

    const viewErrorBtn = result.getByTestId('viewInLogsBtn');
    expect(viewErrorBtn.getAttribute('href')).toEqual(`https://discover-redirect-url`);
  });

  it('should not render open in Logs button if privileges are not set', () => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        readAgents: false,
      },
    } as any);
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

    expect(result.queryByTestId('viewInLogsBtn')).not.toBeInTheDocument();
  });
});
