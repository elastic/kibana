/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EmptyEngineOverview } from './engine_overview_empty';
import { EngineOverviewMetrics } from './engine_overview_metrics';

import { EngineOverview } from '.';

describe('EngineOverview', () => {
  const values = {
    dataLoading: false,
    myRole: {},
    hasNoDocuments: true,
    isMetaEngine: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  describe('EmptyEngineOverview', () => {
    it('renders when the engine has no documents & the user can add documents', () => {
      const myRole = { canManageEngineDocuments: true, canViewEngineCredentials: true };
      setMockValues({ ...values, myRole });
      const wrapper = shallow(<EngineOverview />);
      expect(wrapper.find(EmptyEngineOverview)).toHaveLength(1);
    });
  });

  describe('EngineOverviewMetrics', () => {
    it('renders when the engine has documents', () => {
      setMockValues({ ...values, hasNoDocuments: false });
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
