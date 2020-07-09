/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPanel } from '@elastic/eui';

import { ORG_SOURCES_PATH, USERS_PATH } from '../../routes';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { ContentSection } from '../shared/content_section';
import { OnboardingSteps } from './onboarding_steps';
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
  it('renders', () => {
    const wrapper = shallow(<OnboardingSteps {...defaultServerData} />);

    expect(wrapper.find(ContentSection)).toHaveLength(1);
    expect(wrapper.find(OnboardingCard).prop('actionPath')).toBe(ORG_SOURCES_PATH);
    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(OnboardingCard).prop('description')).toBe(
      'Add shared sources for your organization to start searching.'
    );
  });

  it('renders non-federated card with props', () => {
    const wrapper = shallow(
      <OnboardingSteps
        {...defaultServerData}
        hasUsers
        hasOrgSources
        sourcesCount={2}
        isFederatedAuth={false}
        canCreateContentSources={false}
        fpAccount={account}
      />
    );

    expect(wrapper.find(OnboardingCard)).toHaveLength(2);
    expect(wrapper.find(OnboardingCard).first().prop('actionPath')).toBe(undefined);
    expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(USERS_PATH);
  });

  it('disables acounts path when props false', () => {
    const wrapper = shallow(
      <OnboardingSteps
        {...defaultServerData}
        isFederatedAuth={false}
        canCreateInvitations={false}
      />
    );

    expect(wrapper.find(OnboardingCard).last().prop('actionPath')).toBe(undefined);
  });

  it('sets description when org sources present', () => {
    const wrapper = shallow(
      <OnboardingSteps {...defaultServerData} sourcesCount={1} hasOrgSources />
    );

    expect(wrapper.find(OnboardingCard).prop('description')).toStrictEqual(
      <FormattedMessage
        defaultMessage="You have added {sourcesCount} shared {sourcesCount, number} {sourcesCount, plural, one {source} other {sources} }. Happy searching."
        id="xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.description"
        values={{ sourcesCount: 1 }}
      />
    );
  });

  it('renders button to change name', () => {
    const wrapper = shallow(<OnboardingSteps {...defaultServerData} />);

    const button = wrapper.find('[data-test-subj="orgNameChangeButton"]');

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });

  it('hides org name card when name has been changed', () => {
    const wrapper = shallow(
      <OnboardingSteps
        {...defaultServerData}
        organization={{
          name: 'foo',
          defaultOrgName: 'bar',
        }}
      />
    );

    expect(wrapper.find(EuiPanel)).toHaveLength(0);
  });
});
