/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';

import { OptionalFieldLabel } from '.';

describe('OptionalFieldLabel', () => {
  it('it renders correctly', async () => {
    const wrapper = mount(OptionalFieldLabel);
    expect(wrapper.find('[data-test-subj="form-optional-field-label"]').first().text()).toBe(
      'Optional'
    );
  });
});
