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

import { EuiPageHeader } from '@elastic/eui';

import { EnginesOverviewHeader } from './';

describe('EnginesOverviewHeader', () => {
  const wrapper = shallow(<EnginesOverviewHeader />)
    .find(EuiPageHeader)
    .dive()
    .children()
    .dive();

  it('renders', () => {
    expect(wrapper.find('h1').text()).toEqual('Engines overview');
  });

  it('renders a launch app search button that sends telemetry on click', () => {
    const button = wrapper.find('[data-test-subj="launchButton"]');

    expect(button.prop('href')).toBe('http://localhost:3002/as');
    expect(button.prop('isDisabled')).toBeFalsy();

    button.simulate('click');
    expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalled();
  });
});
