/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow, mount } from 'enzyme';

import { EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { OnboardingCard } from './onboarding_card';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

const cardProps = {
  title: 'My card',
  icon: 'icon',
  description: 'this is a card',
  actionTitle: 'action',
  testSubj: 'actionButton',
  actionPath: '/foo_path',
};

describe('OnboardingCard', () => {
  it('renders', () => {
    const wrapper = shallow(<OnboardingCard {...cardProps} />);
    expect(wrapper.find(EuiFlexItem)).toHaveLength(1);
  });

  it('renders an action button', () => {
    const wrapper = mount(<OnboardingCard {...cardProps} />);
    const button = wrapper.find('a[data-test-subj="actionButton"]');
    expect(button.prop('href')).toBe(`http://localhost:3002/ws${cardProps.actionPath}`);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(0);

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });

  it('renders an empty button when complete is true', () => {
    const wrapper = mount(<OnboardingCard {...cardProps} complete />);
    const button = wrapper.find('a[data-test-subj="actionButton"]');

    expect(button.prop('href')).toBe(`http://localhost:3002/ws${cardProps.actionPath}`);
    expect(wrapper.find(EuiButton)).toHaveLength(0);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });
});
