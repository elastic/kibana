/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiSpacer } from '@elastic/eui';

import { ContentSection } from './';
import { ViewContentHeader } from '../view_content_header';

const props = {
  children: <div className="children" />,
  testSubj: 'contentSection',
};

describe('ContentSection', () => {
  it('renders', () => {
    const wrapper = shallow(<ContentSection {...props} className="test" />);

    expect(wrapper.prop('data-test-subj')).toEqual('contentSection');
    expect(wrapper.prop('className')).toEqual('test content-section');
    expect(wrapper.find('.children')).toHaveLength(1);
  });

  it('displays title and description', () => {
    const wrapper = shallow(<ContentSection {...props} title="foo" description="bar" />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual('foo');
    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual('bar');
  });

  it('displays header content', () => {
    const wrapper = shallow(
      <ContentSection
        {...props}
        title="h"
        headerSpacer="s"
        headerChildren={<div className="header" />}
      />
    );

    expect(wrapper.find(EuiSpacer).first().prop('size')).toEqual('s');
    expect(wrapper.find(EuiSpacer)).toHaveLength(1);
    expect(wrapper.find('.header')).toHaveLength(1);
  });
});
