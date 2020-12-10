/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { Loading } from '../../../shared/loading';
import { EmptyEngineOverview } from './engine_overview_empty';
import { EngineOverviewMetrics } from './engine_overview_metrics';
import { EngineOverview } from './';

describe('EngineOverview', () => {
  const values = {
    dataLoading: false,
    documentCount: 0,
    myRole: {},
    isMetaEngine: false,
  };
  const actions = {
    pollForOverviewMetrics: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<EngineOverview />);
    expect(wrapper.find('[data-test-subj="EngineOverview"]')).toHaveLength(1);
  });

  it('initializes data on mount', () => {
    shallow(<EngineOverview />);
    expect(actions.pollForOverviewMetrics).toHaveBeenCalledTimes(1);
  });

  it('renders a loading component if async data is still loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<EngineOverview />);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  describe('EmptyEngineOverview', () => {
    it('renders when the engine has no documents & the user can add documents', () => {
      const myRole = { canManageEngineDocuments: true, canViewEngineCredentials: true };
      setMockValues({ ...values, myRole, documentCount: 0 });
      const wrapper = shallow(<EngineOverview />);
      expect(wrapper.find(EmptyEngineOverview)).toHaveLength(1);
    });
  });

  describe('EngineOverviewMetrics', () => {
    it('renders when the engine has documents', () => {
      setMockValues({ ...values, documentCount: 1 });
      const wrapper = shallow(<EngineOverview />);
      expect(wrapper.find(EngineOverviewMetrics)).toHaveLength(1);
    });

    it('renders when the user does not have the ability to add documents', () => {
      const myRole = { canManageEngineDocuments: false, canViewEngineCredentials: false };
      setMockValues({ ...values, myRole });
      const wrapper = shallow(<EngineOverview />);
      expect(wrapper.find(EngineOverviewMetrics)).toHaveLength(1);
    });

    it('always renders for meta engines', () => {
      setMockValues({ ...values, isMetaEngine: true });
      const wrapper = shallow(<EngineOverview />);
      expect(wrapper.find(EngineOverviewMetrics)).toHaveLength(1);
    });
  });
});
