/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, State } from '../../../../store';

import { FlowTargetSelectConnected } from './index';
import { IpOverviewId } from '../../../field_renderers/field_renderers';

describe('Flow Target Select Connected', () => {
  const state: State = mockGlobalState;
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });
  test('Pick Relative Date', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <FlowTargetSelectConnected />
      </TestProviders>
    );
    expect(store.getState().network.details.flowTarget).toEqual('source');
    wrapper
      .find('button')
      .first()
      .simulate('click');

    wrapper.update();
    wrapper
      .find(`button#${IpOverviewId}-select-flow-target-destination`)
      .first()
      .simulate('click');

    wrapper.update();
    expect(store.getState().network.details.flowTarget).toEqual('destination');
  });
});
