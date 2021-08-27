/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButtonEmpty } from '@elastic/eui';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';

import { OnboardingCard } from './onboarding_card';

const cardProps = {
  title: 'My card',
  icon: 'icon',
  description: 'this is a card',
  actionTitle: 'action',
  testSubj: 'actionButton',
};

describe('OnboardingCard', () => {
  it('renders', () => {
    const wrapper = shallow(<OnboardingCard {...cardProps} />);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('renders an action button', () => {
    const wrapper = shallow(<OnboardingCard {...cardProps} actionPath="/some_path" />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();

    expect(prompt.find(EuiButtonTo)).toHaveLength(1);
    expect(prompt.find(EuiButtonEmptyTo)).toHaveLength(0);

    const button = prompt.find('[data-test-subj="actionButton"]');
    expect(button.prop('to')).toBe('/some_path');

    button.simulate('click');
    expect(mockTelemetryActions.sendWorkplaceSearchTelemetry).toHaveBeenCalled();
  });

  it('renders an empty button when onboarding is completed', () => {
    const wrapper = shallow(<OnboardingCard {...cardProps} complete />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();

    expect(prompt.find(EuiButtonTo)).toHaveLength(0);
    expect(prompt.find(EuiButtonEmpty)).toHaveLength(1);
  });
});
