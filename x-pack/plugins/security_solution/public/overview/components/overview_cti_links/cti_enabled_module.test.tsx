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
import { I18nProvider } from '@kbn/i18n/react';
import { CtiEnabledModule } from './cti_enabled_module';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockTheme, mockProps, mockCtiEventCountsResponse, mockCtiLinksResponse } from './mock';
import { useCtiEventCounts } from '../../containers/overview_cti_links/use_cti_event_counts';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { useRequestEventCounts } from '../../containers/overview_cti_links/use_request_event_counts';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_cti_links/use_cti_event_counts');
const useCTIEventCountsMock = useCtiEventCounts as jest.Mock;
useCTIEventCountsMock.mockReturnValue(mockCtiEventCountsResponse);

jest.mock('../../containers/overview_cti_links/use_request_event_counts');
const useRequestEventCountsMock = useRequestEventCounts as jest.Mock;
useRequestEventCountsMock.mockReturnValue([true, {}]);

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
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <CtiEnabledModule {...mockProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.exists('[data-test-subj="cti-with-events"]')).toBe(true);
  });

  it('renders CtiWithNoEvents when there are no events', () => {
    useCTIEventCountsMock.mockReturnValueOnce({ totalCount: 0 });
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <CtiEnabledModule {...mockProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.exists('[data-test-subj="cti-with-no-events"]')).toBe(true);
  });

  it('renders null while event counts are loading', () => {
    useCTIEventCountsMock.mockReturnValueOnce({ totalCount: -1 });
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <CtiEnabledModule {...mockProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.html()).toEqual('');
  });
});
