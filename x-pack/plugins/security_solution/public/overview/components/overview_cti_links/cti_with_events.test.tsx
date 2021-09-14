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
import { CtiWithEvents } from './cti_with_events';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockCtiLinksResponse, mockTheme, mockCtiWithEventsProps } from './mock';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';

jest.mock('../../../common/lib/kibana');

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('CtiWithEvents', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders total event count as expected', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <CtiWithEvents {...mockCtiWithEventsProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-total-event-count"]').text()).toEqual(
      `Showing: ${mockCtiWithEventsProps.totalCount} indicators`
    );
  });
});
