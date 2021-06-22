/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { LaunchAppSearchButton } from './';

describe('LaunchAppSearchButton', () => {
  it('renders a launch app search button that sends telemetry on click', () => {
    const button = shallow(<LaunchAppSearchButton />);

    expect(button.prop('href')).toBe('http://localhost:3002/as');
    expect(button.prop('isDisabled')).toBeFalsy();

    button.simulate('click');
    expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalled();
  });
});
