/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { InsertTimelinePopoverComponent } from '.';

const onTimelineChange = jest.fn();
const props = {
  isDisabled: false,
  onTimelineChange,
};

describe('Insert timeline popover ', () => {
  it('it renders', () => {
    const wrapper = mount(<InsertTimelinePopoverComponent {...props} />);
    expect(wrapper.find('[data-test-subj="insert-timeline-popover"]').exists()).toBeTruthy();
  });
});
