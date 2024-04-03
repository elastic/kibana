/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from './__mocks__';
import { mockTelemetryActions } from '../../../__mocks__/kea_logic';
import './__mocks__/overview_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { ADD_SOURCE_PATH, USERS_AND_ROLES_PATH } from '../../routes';

import { OnboardingCard } from './onboarding_card';
import { OnboardingSteps, OrgNameOnboarding } from './onboarding_steps';

const account = {
  id: '1',
  isAdmin: true,
  canCreatePrivateSources: true,
  groups: [],
};

describe('OnboardingSteps', () => {
  describe('Organizational Sources', () => {
    it('renders 0 sources state', () => {
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard)).toHaveLength(2);
      expect(wrapper.find(OnboardingCard).first().prop('actionPath')).toBe(ADD_SOURCE_PATH);
      expect(wrapper.find(OnboardingCard).first().prop('description')).toBe(
        'Add organizational sources for your organization to start searching.'
      );
    });

    it('renders completed sources state', () => {
      setMockValues({ sourcesCount: 2, hasOrgSources: true });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard).first().prop('description')).toEqual(
        'You have added 2 organizational sources. Happy searching.'
      );
    });
  });

  describe('Users & Invitations', () => {
    it('renders 0 users state', () => {
      setMockValues({
        account,
        accountsCount: 0,
        hasUsers: false,
      });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard)).toHaveLength(2);
      expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(USERS_AND_ROLES_PATH);
      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Invite your colleagues into this organization to search with you.'
      );
    });

    it('renders completed users state', () => {
      setMockValues({
        account,
        accountsCount: 1,
        hasUsers: true,
      });
      const wrapper = shallow(<OnboardingSteps />);

      expect(wrapper.find(OnboardingCard).last().prop('description')).toEqual(
        'Nice, you’ve invited colleagues to search with you.'
      );
    });
  });

  describe('Org Name', () => {
    it('renders button to change name', () => {
      setMockValues({
        organization: {
          name: 'foo',
          defaultOrgName: 'foo',
        },
      });
      const wrapper = shallow(<OnboardingSteps />);

      const button = wrapper
        .find(OrgNameOnboarding)
        .dive()
        .find('[data-test-subj="orgNameChangeButton"]');

      button.simulate('click');
      expect(mockTelemetryActions.sendWorkplaceSearchTelemetry).toHaveBeenCalled();
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
