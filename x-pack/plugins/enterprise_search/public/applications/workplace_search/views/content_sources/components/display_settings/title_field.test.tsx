/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TitleField } from './title_field';

describe('TitleField', () => {
  const result = { foo: 'bar' };
  it('renders', () => {
    const props = {
      result,
      titleField: 'foo',
      titleFieldHover: false,
    };
    const wrapper = shallow(<TitleField {...props} />);

    expect(wrapper.find('[data-test-subj="TitleField"]')).toHaveLength(1);
  });

  it('handles title when array', () => {
    const props = {
      result: { foo: ['baz', 'bar'] },
      titleField: 'foo',
      titleFieldHover: false,
    };
    const wrapper = shallow(<TitleField {...props} />);

    expect(wrapper.find('[data-test-subj="CustomTitleLabel"]').text()).toEqual('baz, bar');
  });

  it('shows fallback URL label when no override set', () => {
    const props = {
      result,
      titleField: null,
      titleFieldHover: false,
    };
    const wrapper = shallow(<TitleField {...props} />);

    expect(wrapper.find('[data-test-subj="DefaultTitleLabel"]')).toHaveLength(1);
  });
});
