/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
  mockIndexPattern,
} from '../../../common/mock';

import { ThreatIntelLinkPanel } from '.';
import { createStore, State } from '../../../common/store';
import { useThreatIntelDashboardLinks } from '../../containers/overview_cti_links';
import { mockData as mockCtiLinks } from './mock';

jest.mock('../../../common/lib/kibana');

const testProps = {
  to: '2020-01-20T20:49:57.080Z',
  from: '2020-01-21T20:49:57.080Z',
  indexNames: [],
  indexPattern: mockIndexPattern,
  setQuery: jest.fn(),
  deleteQuery: jest.fn(),
  filters: [],
};

jest.mock('../../containers/overview_cti_links');
const useThreatIntelDashboardLinksMock = useThreatIntelDashboardLinks as jest.Mock;
useThreatIntelDashboardLinksMock.mockReturnValue(mockCtiLinks);

describe('OverviewCTILinks', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  test('it appears if dashboard links are present', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <ThreatIntelLinkPanel {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().text()).toEqual(
      'Threat Intelligence'
    );
  });

  test('does not appear if dashboard links are not present', () => {
    useThreatIntelDashboardLinksMock.mockReturnValueOnce([
      true,
      {
        buttonLink: null,
        dashboardLinks: [],
        totalEventCount: 0,
      },
    ]);
    const wrapper = mount(
      <TestProviders store={store}>
        <ThreatIntelLinkPanel {...testProps} />
      </TestProviders>
    );
    const element = wrapper.find('[data-test-subj="cti-dashboard-links"]').first();
    expect(element).toEqual({});
  });

  test('it renders links', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <ThreatIntelLinkPanel {...testProps} />
      </TestProviders>
    );

    const hrefs = wrapper
      .find('[data-test-subj="cti-dashboard-link"]')
      .map((link) => link.props().href);

    expect(hrefs).toContain('/dashboard-link-0');
    expect(hrefs).toContain('/dashboard-link-1');
  });
});
