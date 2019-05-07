/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { FlowTarget } from '../../../../graphql/types';
import { mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { IpOverview } from './index';
import { mockData } from './mock';

describe('IP Overview Component', () => {
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    const mockProps = {
      flowTarget: FlowTarget.source,
      loading: false,
      ip: '10.10.10.10',
      data: mockData.IpOverview,
      type: networkModel.NetworkType.details,
      updateFlowTargetAction: (jest.fn() as unknown) as ActionCreator<{
        flowTarget: FlowTarget;
      }>,
    };

    test('it renders the default IP Overview', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <IpOverview {...mockProps} />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
