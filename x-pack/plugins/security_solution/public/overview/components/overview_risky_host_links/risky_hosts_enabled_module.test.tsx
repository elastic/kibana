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
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { useRiskyHostsDashboardButtonHref } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { useRiskyHostsDashboardLinks } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links';
import { mockTheme } from '../overview_cti_links/mock';
import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href');
const useRiskyHostsDashboardButtonHrefMock = useRiskyHostsDashboardButtonHref as jest.Mock;
useRiskyHostsDashboardButtonHrefMock.mockReturnValue({ buttonHref: '/test' });

jest.mock('../../containers/overview_risky_host_links/use_risky_hosts_dashboard_links');
const useRiskyHostsDashboardLinksMock = useRiskyHostsDashboardLinks as jest.Mock;
useRiskyHostsDashboardLinksMock.mockReturnValue({
  listItemsWithLinks: [{ title: 'a', count: 1, path: '/test' }],
});

describe('RiskyHostsEnabledModule', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders expected children', () => {
    render(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <RiskyHostsEnabledModule
              hostRiskScore={[
                {
                  '@timestamp': '1641902481',
                  host: {
                    name: 'a',
                  },
                  risk_stats: {
                    risk_score: 1,
                    rule_risks: [],
                  },
                  risk: '',
                },
              ]}
              to={'now'}
              from={'now-30d'}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );
    expect(screen.getByTestId('risky-hosts-dashboard-links')).toBeInTheDocument();
  });
});
