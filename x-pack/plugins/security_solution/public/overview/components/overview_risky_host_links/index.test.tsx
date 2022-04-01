/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { cloneDeep } from 'lodash/fp';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from 'styled-components';
import { mockTheme } from '../overview_cti_links/mock';
import { RiskyHostLinks } from '.';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { useRiskyHostsDashboardButtonHref } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { useRiskyHostsDashboardLinks } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links';
import { useHostRiskScore } from '../../../risk_score/containers';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../risk_score/containers');
const useHostRiskScoreMock = useHostRiskScore as jest.Mock;

jest.mock('../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href');
const useRiskyHostsDashboardButtonHrefMock = useRiskyHostsDashboardButtonHref as jest.Mock;
useRiskyHostsDashboardButtonHrefMock.mockReturnValue({ buttonHref: '/test' });

jest.mock('../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links');
const useRiskyHostsDashboardLinksMock = useRiskyHostsDashboardLinks as jest.Mock;
useRiskyHostsDashboardLinksMock.mockReturnValue({
  listItemsWithLinks: [{ title: 'a', count: 1, path: '/test' }],
});

describe('RiskyHostLinks', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders enabled module view if module is enabled', () => {
    useHostRiskScoreMock.mockReturnValueOnce([
      false,
      {
        data: [],
        isModuleEnabled: true,
      },
    ]);

    render(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <RiskyHostLinks
              setQuery={jest.fn()}
              deleteQuery={jest.fn()}
              timerange={{
                to: 'now',
                from: 'now-30d',
              }}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(screen.queryByTestId('risky-hosts-enable-module-button')).not.toBeInTheDocument();
  });

  it('renders disabled module view if module is disabled', () => {
    useHostRiskScoreMock.mockReturnValueOnce([
      false,
      {
        data: [],
        isModuleEnabled: false,
      },
    ]);

    render(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <RiskyHostLinks
              setQuery={jest.fn()}
              deleteQuery={jest.fn()}
              timerange={{
                to: 'now',
                from: 'now-30d',
              }}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(screen.getByTestId('risky-hosts-enable-module-button')).toBeInTheDocument();
  });
});
