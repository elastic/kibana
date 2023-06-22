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

import { ViewErrors } from './view_errors';

jest.mock('@kbn/shared-ux-link-redirect-app', () => ({
  RedirectAppLinks: (props: any) => {
    return <div>{props.children}</div>;
  },
}));

jest.mock('../../../../hooks', () => {
  return {
    useStartServices: jest.fn().mockReturnValue({
      http: {
        basePath: {
          prepend: jest.fn().mockImplementation((str) => 'http://localhost' + str),
        },
      },
    }),
  };
});

describe('ViewErrors', () => {
  const renderComponent = (action: ActionStatus) => {
    return render(
      <I18nProvider>
        <ViewErrors action={action} />
      </I18nProvider>
    );
  };

  it('should render error message with btn to logs', () => {
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

    const viewErrorBtn = result.getByTestId('viewLogsBtn');
    expect(viewErrorBtn.getAttribute('href')).toEqual(
      `http://localhost/app/logs/stream?logPosition=(position%3A(time%3A1678114284709)%2CstreamLive%3A!f)&logFilter=(expression%3A'elastic_agent.id%3Aagent1%20and%20(data_stream.dataset%3Aelastic_agent)%20and%20(log.level%3Aerror)'%2Ckind%3Akuery)`
    );
  });
});
