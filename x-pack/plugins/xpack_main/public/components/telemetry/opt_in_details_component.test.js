/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { OptInExampleFlyout } from './opt_in_details_component';

describe('OptInDetailsComponent', () => {
  it('renders as expected', () => {
    expect(shallow(<OptInExampleFlyout fetchTelemetry={jest.fn(async () => ({ data: [] }))} onClose={jest.fn()} />)).toMatchSnapshot();
  });
});