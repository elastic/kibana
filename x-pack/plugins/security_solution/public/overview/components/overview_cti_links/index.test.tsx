/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { ThreatIntelLinkPanel } from '.';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockTheme, mockProps, mockTiDataSources, mockCtiLinksResponse } from './mock';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_cti_links/use_ti_data_sources');
const useTiDataSourcesMock = useTiDataSources as jest.Mock;
useTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('ThreatIntelLinkPanel', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders CtiEnabledModule when Threat Intel module is enabled', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelLinkPanel {...mockProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-enabled-module"]').length).toEqual(1);
    expect(wrapper.find('[data-test-subj="cti-enable-integrations-button"]').length).toEqual(0);
  });

  it('renders CtiDisabledModule when Threat Intel module is disabled', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelLinkPanel {...mockProps} allTiDataSources={[]} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-disabled-module"]').length).toEqual(1);
  });
});
