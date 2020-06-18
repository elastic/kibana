/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { FlowTarget } from '../../../graphql/types';
import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { createStore, State } from '../../../common/store';
import { networkModel } from '../../store';

import { IpOverview } from './index';
import { mockData } from './mock';
import { mockAnomalies } from '../../../common/components/ml/mock';
import { NarrowDateRange } from '../../../common/components/ml/types';

describe('IP Overview Component', () => {
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  describe('rendering', () => {
    const mockProps = {
      anomaliesData: mockAnomalies,
      data: mockData.IpOverview,
      endDate: new Date('2019-06-18T06:00:00.000Z').valueOf(),
      flowTarget: FlowTarget.source,
      loading: false,
      id: 'ipOverview',
      ip: '10.10.10.10',
      isLoadingAnomaliesData: false,
      narrowDateRange: (jest.fn() as unknown) as NarrowDateRange,
      startDate: new Date('2019-06-15T06:00:00.000Z').valueOf(),
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

      expect(wrapper.find('IpOverview')).toMatchSnapshot();
    });
  });
});
