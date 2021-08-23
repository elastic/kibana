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
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { RiskyHostsDisabledModule } from './risky_hosts_disabled_module';
import { mockTheme } from '../overview_cti_links/mock';

jest.mock('../../../common/lib/kibana');

describe('RiskyHostsModule', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders expected children', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <RiskyHostsDisabledModule />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.exists('[data-test-subj="risky-hosts-dashboard-links"]')).toEqual(true);
    expect(wrapper.exists('[data-test-subj="risky-hosts-view-dashboard-button"]')).toEqual(true);
    expect(wrapper.exists('[data-test-subj="risky-hosts-enable-module-button"]')).toEqual(true);
  });
});
