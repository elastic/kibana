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
import { ThreatIntelPanelView } from './threat_intel_panel_view';
import { ThemeProvider } from 'styled-components';
import { createStore, State } from '../../../common/store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockTheme, mockThreatIntelPanelViewProps } from './mock';

jest.mock('../../../common/lib/kibana');

describe('ThreatIntelPanelView', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('renders enabled button when there is a button href', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...mockThreatIntelPanelViewProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('button').props().disabled).toEqual(false);
  });

  it('renders disabled button when there is no button href', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...{ ...mockThreatIntelPanelViewProps, buttonHref: '' }} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('button').at(1).props().disabled).toEqual(true);
  });

  it('renders info panel if dashboard plugin is disabled', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView
              {...{ ...mockThreatIntelPanelViewProps, isDashboardPluginDisabled: true }}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-inner-panel-info"]').hostNodes().length).toEqual(1);
  });

  it('does not render info panel if dashboard plugin is disabled', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView
              {...{ ...mockThreatIntelPanelViewProps, isDashboardPluginDisabled: false }}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-inner-panel-info"]').length).toEqual(0);
  });

  it('renders split panel if split panel is passed in as a prop', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView
              {...{
                ...mockThreatIntelPanelViewProps,
                splitPanel: <div data-test-subj="mock-split-panel" />,
              }}
            />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="mock-split-panel"]').length).toEqual(1);
  });

  it('renders list items with links', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...mockThreatIntelPanelViewProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('li a').at(0).props().href).toEqual(
      mockThreatIntelPanelViewProps.listItems[0].path
    );
  });

  it('renders total event count', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...mockThreatIntelPanelViewProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.find('[data-test-subj="cti-total-event-count"]').text()).toEqual(
      `Showing: ${mockThreatIntelPanelViewProps.totalEventCount} events`
    );
  });

  it('renders inspect button by default', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...mockThreatIntelPanelViewProps} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.exists('[data-test-subj="inspect-icon-button"]')).toBe(true);
  });

  it('does not render inspect button if isInspectEnabled is false', () => {
    const wrapper = mount(
      <Provider store={store}>
        <I18nProvider>
          <ThemeProvider theme={mockTheme}>
            <ThreatIntelPanelView {...mockThreatIntelPanelViewProps} isInspectEnabled={false} />
          </ThemeProvider>
        </I18nProvider>
      </Provider>
    );

    expect(wrapper.exists('[data-test-subj="inspect-icon-button"]')).toBe(false);
  });
});
