/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { EngineOverviewHeader } from '../engine_overview_header';

describe('EngineOverviewHeader', () => {
  it('renders', () => {
    const wrapper = shallow(<EngineOverviewHeader />);
    expect(wrapper.find('h1')).toHaveLength(1);
  });

  it('renders a launch app search button that sends telemetry on click', () => {
    const wrapper = shallow(<EngineOverviewHeader />);
    const button = wrapper.find('[data-test-subj="launchButton"]');

    expect(button.prop('href')).toBe('http://localhost:3002/as');
    expect(button.prop('isDisabled')).toBeFalsy();

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });

  it('renders a disabled button when isButtonDisabled is true', () => {
    const wrapper = shallow(<EngineOverviewHeader isButtonDisabled />);
    const button = wrapper.find('[data-test-subj="launchButton"]');

    expect(button.prop('isDisabled')).toBe(true);
    expect(button.prop('href')).toBeUndefined();
  });
});
