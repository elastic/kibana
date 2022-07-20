/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from 'styled-components';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';

import { mockTheme } from '../overview_cti_links/mock';
import { RiskyHostsPanelView } from './risky_hosts_panel_view';
import { useDashboardButtonHref } from '../../../common/hooks/use_dashboard_button_href';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/hooks/use_dashboard_button_href');
const useRiskyHostsDashboardButtonHrefMock = useDashboardButtonHref as jest.Mock;
useRiskyHostsDashboardButtonHrefMock.mockReturnValue({ buttonHref: '/test' });

describe('RiskyHostsPanelView', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    render(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <RiskyHostsPanelView
              isInspectEnabled={true}
              listItems={[{ title: 'a', count: 1, path: '/test' }]}
              totalCount={1}
              to={'now'}
              from={'now-30d'}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );
  });

  it('renders title', () => {
    expect(screen.getByTestId('header-section-title')).toHaveTextContent(
      'Current host risk scores'
    );
  });

  it('renders host number', () => {
    expect(screen.getByTestId('header-panel-subtitle')).toHaveTextContent('Showing: 1 host');
  });

  it('renders view dashboard button', () => {
    expect(screen.getByTestId('create-saved-object-success-button')).toHaveAttribute(
      'href',
      '/test'
    );
    expect(screen.getByTestId('create-saved-object-success-button')).toHaveTextContent(
      'View dashboard'
    );
  });
});
