/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { ORG_SOURCES_PATH, USERS_PATH } from '../../routes';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { OnboardingSteps, OrgNameOnboarding } from './onboarding_steps';
import { OnboardingCard } from './onboarding_card';
import { defaultServerData } from './overview';

const account = {
  id: '1',
  isAdmin: true,
  canCreatePersonalSources: true,
  groups: [],
  supportEligible: true,
  isCurated: false,
};

describe('OnboardingSteps', () => {
  describe('Shared Sources', () => {
    it('renders 0 sources state', () => {
      const wrapper = shallow(<OnboardingSteps {...defaultServerData} />);

      expect(wrapper.find(OnboardingCard)).toHaveLength(1);
      expect(wrapper.find(OnboardingCard).prop('actionPath')).toBe(ORG_SOURCES_PATH);
      expect(wrapper.find(OnboardingCard).prop('description')).toBe(
        'Add shared sources for your organization to start searching.'
      );
    });

    it('renders completed sources state', () => {
      const wrapper = shallow(
        <OnboardingSteps {...defaultServerData} sourcesCount={2} hasOrgSources />
      );

      expect(wrapper.find(OnboardingCard).prop('description')).toEqual(
        'You have added 2 shared sources. Happy searching.'
      );
    });

    it('disables link when the user cannot create sources', () => {
      const wrapper = shallow(
        <OnboardingSteps {...defaultServerData} canCreateContentSources={false} />
      );

      expect(wrapper.find(OnboardingCard).prop('actionPath')).toBe(undefined);
    });
  });

  describe('Users & Invitations', () => {
    it('renders 0 users when not on federated auth', () => {
      const wrapper = shallow(
        <OnboardingSteps
          {...defaultServerData}
          isFederatedAuth={false}
          fpAccount={account}
          accountsCount={0}
          hasUsers={false}
        />
      );

      expect(wrapper.find(OnboardingCard)).toHaveLength(2);
      expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(USERS_PATH);
      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Invite your colleagues into this organization to search with you.'
      );
    });

    it('renders completed users state', () => {
      const wrapper = shallow(
        <OnboardingSteps
          {...defaultServerData}
          isFederatedAuth={false}
          fpAccount={account}
          accountsCount={1}
          hasUsers
        />
      );

      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Nice, you’ve invited colleagues to search with you.'
      );
    });

    it('disables link when the user cannot create invitations', () => {
      const wrapper = shallow(
        <OnboardingSteps
          {...defaultServerData}
          isFederatedAuth={false}
          canCreateInvitations={false}
        />
      );

      expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(undefined);
    });
  });

  describe('Org Name', () => {
    it('renders button to change name', () => {
      const wrapper = shallow(<OnboardingSteps {...defaultServerData} />);

      const button = wrapper
        .find(OrgNameOnboarding)
        .dive()
        .find('[data-test-subj="orgNameChangeButton"]');

      button.simulate('click');
      expect(sendTelemetry).toHaveBeenCalled();
    });

    it('hides card when name has been changed', () => {
      const wrapper = shallow(
        <OnboardingSteps
          {...defaultServerData}
          organization={{
            name: 'foo',
            defaultOrgName: 'bar',
          }}
        />
      );

      expect(wrapper.find(OrgNameOnboarding)).toHaveLength(0);
    });
  });
});
