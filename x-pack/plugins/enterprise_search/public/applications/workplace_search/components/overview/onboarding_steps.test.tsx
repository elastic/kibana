/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';
import './__mocks__/overview_logic.mock';
import { setMockValues } from './__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { ORG_SOURCES_PATH, USERS_PATH } from '../../routes';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { OnboardingSteps, OrgNameOnboarding } from './onboarding_steps';
import { OnboardingCard } from './onboarding_card';

const account = {
  id: '1',
  isAdmin: true,
  canCreatePersonalSources: true,
  groups: [],
  isCurated: false,
};

describe('OnboardingSteps', () => {
  describe('Shared Sources', () => {
    it('renders 0 sources state', () => {
      setMockValues({ canCreateContentSources: true });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard)).toHaveLength(1);
      expect(wrapper.find(OnboardingCard).prop('actionPath')).toBe(ORG_SOURCES_PATH);
      expect(wrapper.find(OnboardingCard).prop('description')).toBe(
        'Add shared sources for your organization to start searching.'
      );
    });

    it('renders completed sources state', () => {
      setMockValues({ sourcesCount: 2, hasOrgSources: true });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard).prop('description')).toEqual(
        'You have added 2 shared sources. Happy searching.'
      );
    });

    it('disables link when the user cannot create sources', () => {
      setMockValues({ canCreateContentSources: false });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard).prop('actionPath')).toBe(undefined);
    });
  });

  describe('Users & Invitations', () => {
    it('renders 0 users when not on federated auth', () => {
      setMockValues({
        canCreateInvitations: true,
        isFederatedAuth: false,
        fpAccount: account,
        accountsCount: 0,
        hasUsers: false,
      });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard)).toHaveLength(2);
      expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(USERS_PATH);
      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Invite your colleagues into this organization to search with you.'
      );
    });

    it('renders completed users state', () => {
      setMockValues({
        isFederatedAuth: false,
        fpAccount: account,
        accountsCount: 1,
        hasUsers: true,
      });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Nice, you’ve invited colleagues to search with you.'
      );
    });

    it('disables link when the user cannot create invitations', () => {
      setMockValues({ isFederatedAuth: false, canCreateInvitations: false });
      const wrapper = shallow(<OnboardingSteps />);
      expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(undefined);
    });
  });

  describe('Org Name', () => {
    it('renders button to change name', () => {
      const wrapper = shallow(<OnboardingSteps />);

      const button = wrapper
        .find(OrgNameOnboarding)
        .dive()
        .find('[data-test-subj="orgNameChangeButton"]');

      button.simulate('click');
      expect(sendTelemetry).toHaveBeenCalled();
    });

    it('hides card when name has been changed', () => {
      setMockValues({
        organization: {
          name: 'foo',
          defaultOrgName: 'bar',
        },
      });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OrgNameOnboarding)).toHaveLength(0);
    });
  });
});
