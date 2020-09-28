/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';
import './__mocks__/overview_logic.mock';
import { mockActions, setMockValues } from './__mocks__';

import React from 'react';
import { shallow, mount } from 'enzyme';

import { Loading } from '../../components/shared/loading';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { OnboardingSteps } from './onboarding_steps';
import { OrganizationStats } from './organization_stats';
import { RecentActivity } from './recent_activity';
import { Overview } from './overview';

describe('Overview', () => {
  describe('non-happy-path states', () => {
    it('isLoading', () => {
      const wrapper = shallow(<Overview />);

      expect(wrapper.find(Loading)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    it('calls initialize function', async () => {
      mount(<Overview />);

      expect(mockActions.initializeOverview).toHaveBeenCalled();
    });

    it('renders onboarding state', () => {
      setMockValues({ dataLoading: false });
      const wrapper = shallow(<Overview />);

      expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
      expect(wrapper.find(OnboardingSteps)).toHaveLength(1);
      expect(wrapper.find(OrganizationStats)).toHaveLength(1);
      expect(wrapper.find(RecentActivity)).toHaveLength(1);
    });

    it('renders when onboarding complete', () => {
      setMockValues({
        dataLoading: false,
        hasUsers: true,
        hasOrgSources: true,
        isOldAccount: true,
        organization: {
          name: 'foo',
          defaultOrgName: 'bar',
        },
      });
      const wrapper = shallow(<Overview />);

      expect(wrapper.find(OnboardingSteps)).toHaveLength(0);
    });
  });
});
