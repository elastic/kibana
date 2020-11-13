/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TruncatedContent } from './';

const content = 'foobarbaz';

describe('TruncatedContent', () => {
  it('renders with no truncation', () => {
    const wrapper = shallow(<TruncatedContent length={4} content="foo" />);

    expect(wrapper.find('span.truncated-content')).toHaveLength(0);
    expect(wrapper.text()).toEqual('foo');
  });

  it('renders with truncation at the end', () => {
    const wrapper = shallow(<TruncatedContent tooltipType="title" length={4} content={content} />);
    const element = wrapper.find('span.truncated-content');

    expect(element).toHaveLength(1);
    expect(element.prop('title')).toEqual(content);
    expect(wrapper.text()).toEqual('foob…');
    expect(wrapper.find('span.truncated-content__tooltip')).toHaveLength(0);
  });

  it('renders with truncation at the beginning', () => {
    const wrapper = shallow(
      <TruncatedContent tooltipType="title" beginning length={4} content={content} />
    );

    expect(wrapper.find('span.truncated-content')).toHaveLength(1);
    expect(wrapper.text()).toEqual('…rbaz');
  });

  it('renders with inline tooltip', () => {
    const wrapper = shallow(<TruncatedContent beginning length={4} content={content} />);

    expect(wrapper.find('span.truncated-content').prop('title')).toEqual('');
    expect(wrapper.find('span.truncated-content__tooltip')).toHaveLength(1);
  });
});
