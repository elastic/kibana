/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiText, EuiTextColor } from '@elastic/eui';

import { SourceIcon } from '../../../../components/shared/source_icon';

import { AddSourceHeader } from './add_source_header';

describe('AddSourceHeader', () => {
  const props = {
    name: 'foo',
    serviceType: 'gmail',
    categories: ['bar', 'baz'],
  };
  it('renders', () => {
    const wrapper = shallow(<AddSourceHeader {...props} />);

    expect(wrapper.find(SourceIcon)).toHaveLength(1);
    expect(wrapper.find(EuiTextColor).prop('children')).toEqual(props.name);
    expect(wrapper.find(EuiText).last().prop('children')).toEqual('Bar, Baz');
  });
});
