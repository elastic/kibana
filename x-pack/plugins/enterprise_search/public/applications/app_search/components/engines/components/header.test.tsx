/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';
import '../../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EnginesOverviewHeader } from './';

describe('EnginesOverviewHeader', () => {
  it('renders', () => {
    const wrapper = shallow(<EnginesOverviewHeader />);
    expect(wrapper.find('h1')).toHaveLength(1);
  });

  it('renders a launch app search button that sends telemetry on click', () => {
    const wrapper = shallow(<EnginesOverviewHeader />);
    const button = wrapper.find('[data-test-subj="launchButton"]');

    expect(button.prop('href')).toBe('http://localhost:3002/as');
    expect(button.prop('isDisabled')).toBeFalsy();

    button.simulate('click');
    expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalled();
  });
});
