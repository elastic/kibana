/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import { EnterpriseSearchContentPageTemplate } from '../layout';

import { NotFound } from './';

describe('NotFound', () => {
  const wrapper = shallow(<NotFound />);

  it('renders the shared not found prompt', () => {
    expect(wrapper.find(NotFoundPrompt)).toHaveLength(1);
  });

  it('renders a telemetry error event', () => {
    expect(wrapper.find(SendEnterpriseSearchTelemetry).prop('action')).toEqual('error');
  });

  it('passes optional preceding page chrome', () => {
    wrapper.setProps({ pageChrome: ['Search indices', 'some-index'] });

    expect(wrapper.find(EnterpriseSearchContentPageTemplate).prop('pageChrome')).toEqual([
      'Search indices',
      'some-index',
      '404',
    ]);
  });
});
