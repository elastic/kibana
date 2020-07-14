/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiTitle, EuiSpacer } from '@elastic/eui';

import { ContentSection } from './';

const props = {
  children: <div className="children" />,
  testSubj: 'contentSection',
  className: 'test',
};

describe('ContentSection', () => {
  it('renders', () => {
    const wrapper = shallow(<ContentSection {...props} />);

    expect(wrapper.prop('data-test-subj')).toEqual('contentSection');
    expect(wrapper.prop('className')).toEqual('test');
    expect(wrapper.find('.children')).toHaveLength(1);
  });

  it('displays title and description', () => {
    const wrapper = shallow(<ContentSection {...props} title="foo" description="bar" />);

    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find('p').text()).toEqual('bar');
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

    expect(wrapper.find(EuiSpacer).prop('size')).toEqual('s');
    expect(wrapper.find('.header')).toHaveLength(1);
  });
});
