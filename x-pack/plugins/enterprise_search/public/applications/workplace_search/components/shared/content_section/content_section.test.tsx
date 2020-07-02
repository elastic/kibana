/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { ContentSection } from './';

const props = {
  children: <div />,
  testSubj: 'contentSection',
};

describe('ContentSection', () => {
  it('renders', () => {
    const wrapper = shallow(<ContentSection {...props} />);

    expect(wrapper.find(`[data-test-subj="${props.testSubj}"]`)).toHaveLength(1);
  });

  it('displays title', () => {
    const wrapper = shallow(
      <ContentSection {...props} headerSpacer="s" title="foo" description="bar" />
    );

    expect(wrapper.find('.section-header')).toHaveLength(1);
    expect(wrapper.find('.section-header__description')).toHaveLength(1);
  });
});
