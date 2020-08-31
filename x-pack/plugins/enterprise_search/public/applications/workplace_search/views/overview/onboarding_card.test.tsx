/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { OnboardingCard } from './onboarding_card';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

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

    expect(prompt.find(EuiButton)).toHaveLength(1);
    expect(prompt.find(EuiButtonEmpty)).toHaveLength(0);

    const button = prompt.find('[data-test-subj="actionButton"]');
    expect(button.prop('href')).toBe('http://localhost:3002/ws/some_path');

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });

  it('renders an empty button when onboarding is completed', () => {
    const wrapper = shallow(<OnboardingCard {...cardProps} complete />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();

    expect(prompt.find(EuiButton)).toHaveLength(0);
    expect(prompt.find(EuiButtonEmpty)).toHaveLength(1);
  });
});
