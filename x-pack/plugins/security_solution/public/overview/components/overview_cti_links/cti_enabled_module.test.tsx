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
import { CtiEnabledModule } from './cti_enabled_module';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockTheme, mockProps, mockTiDataSources, mockCtiLinksResponse } from './mock';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_cti_links/use_ti_data_sources');
const useTiDataSourcesMock = useTiDataSources as jest.Mock;
useTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('CtiEnabledModule', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders CtiWithEvents when there are events', () => {
    render(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <CtiEnabledModule {...mockProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(screen.getByText('Showing: 5 indicators')).toBeInTheDocument();
  });
});
