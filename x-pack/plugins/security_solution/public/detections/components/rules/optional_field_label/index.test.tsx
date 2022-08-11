/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

import { OptionalFieldLabel } from '.';

describe('OptionalFieldLabel', () => {
  it('renders correctly', () => {
    const wrapper = shallow(OptionalFieldLabel);

    expect(wrapper.find('EuiTextColor')).toHaveLength(1);
  });
});
