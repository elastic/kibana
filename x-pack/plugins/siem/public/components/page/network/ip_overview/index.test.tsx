/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { IpOverview, IpOverviewId } from './index';
import { mockData } from './mock';

describe('IP Overview Component', () => {
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default IP Overview', () => {
      const wrapper = shallow(
        <TestProviders>
          <IpOverview
            loading={false}
            ip="10.10.10.10"
            data={mockData.IpOverview}
            type={networkModel.NetworkType.details}
          />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('changing selected type', () => {
    test('selecting destination from the type drop down', () => {
      const wrapper = mountWithIntl(
        <MockedProvider>
          <TestProviders store={store}>
            <IpOverview
              loading={false}
              ip="10.10.10.10"
              data={mockData.complete}
              type={networkModel.NetworkType.details}
            />
          </TestProviders>
        </MockedProvider>
      );

      wrapper
        .find(`[data-test-subj="${IpOverviewId}-select-flow-target"] button`)
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${IpOverviewId}-select-flow-target-destination`)
        .first()
        .simulate('click');

      expect(
        wrapper
          .find(`[data-test-subj="${IpOverviewId}-select-flow-target"] button`)
          .first()
          .text()
          .toLocaleLowerCase()
      ).toEqual('as destination');
    });
  });
});
