/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../../common/mock/match_media';
import {
  apolloClientObservable,
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../../../common/mock';
import { RuleDetailsPageComponent } from './index';
import { createStore, State } from '../../../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { useUserInfo } from '../../../../components/user_info';
import { useWithSource } from '../../../../../common/containers/source';
import { useParams } from 'react-router-dom';

jest.mock('../../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest
    .fn()
    .mockReturnValue({ from: 0, isInitializing: false, to: 0, setQuery: jest.fn() }),
}));

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  state,
  SUB_PLUGINS_REDUCER,
  apolloClientObservable,
  kibanaObservable,
  storage
);

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    (useParams as jest.Mock).mockReturnValue({});
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <RuleDetailsPageComponent
          query={{ query: '', language: 'language' }}
          filters={[]}
          setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
        />
      </TestProviders>,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('DetectionEngineHeaderPage')).toHaveLength(1);
  });
});
