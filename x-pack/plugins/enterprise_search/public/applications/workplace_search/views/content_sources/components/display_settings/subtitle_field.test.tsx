/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SubtitleField } from './subtitle_field';

describe('SubtitleField', () => {
  const result = { foo: 'bar' };
  it('renders', () => {
    const props = {
      result,
      subtitleField: 'foo',
      subtitleFieldHover: false,
    };
    const wrapper = shallow(<SubtitleField {...props} />);

    expect(wrapper.find('[data-test-subj="SubtitleField"]')).toHaveLength(1);
  });

  it('shows fallback URL label when no override set', () => {
    const props = {
      result,
      subtitleField: null,
      subtitleFieldHover: false,
    };
    const wrapper = shallow(<SubtitleField {...props} />);

    expect(wrapper.find('[data-test-subj="DefaultSubtitleLabel"]')).toHaveLength(1);
  });
});
