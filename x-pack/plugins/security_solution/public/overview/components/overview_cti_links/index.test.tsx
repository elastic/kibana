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
import { ThreatIntelLinkPanel } from '.';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockTheme, mockProps, mockCtiEventCountsResponse } from './mock';
import { useRequestEventCounts } from '../../containers/overview_cti_links/use_request_event_counts';
import { useCtiEventCounts } from '../../containers/overview_cti_links/use_cti_event_counts';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_cti_links/use_request_event_counts');
const useRequestEventCountsMock = useRequestEventCounts as jest.Mock;
useRequestEventCountsMock.mockReturnValue([true, {}]);

jest.mock('../../containers/overview_cti_links/use_cti_event_counts');
const useCTIEventCountsMock = useCtiEventCounts as jest.Mock;
useCTIEventCountsMock.mockReturnValue(mockCtiEventCountsResponse);

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
            <ThreatIntelLinkPanel {...mockProps} isThreatIntelModuleEnabled={true} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-enabled-module"]').length).toEqual(1);
  });

  it('renders CtiDisabledModule when Threat Intel module is disabled', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelLinkPanel {...mockProps} isThreatIntelModuleEnabled={false} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-disabled-module"]').length).toEqual(1);
  });

  it('renders null while Threat Intel module state is loading', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelLinkPanel {...mockProps} isThreatIntelModuleEnabled={undefined} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.html()).toEqual('');
  });
});
