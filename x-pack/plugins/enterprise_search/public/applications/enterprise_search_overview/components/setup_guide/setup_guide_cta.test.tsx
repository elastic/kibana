/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { SetupGuideCta } from '.';

describe('SetupGuideCta', () => {
  it('renders', () => {
    const wrapper = shallow(<SetupGuideCta />);

    expect(wrapper.find('.enterpriseSearchSetupCta')).toHaveLength(1);
    expect(wrapper.find('EuiImage')).toHaveLength(1);
  });
});
