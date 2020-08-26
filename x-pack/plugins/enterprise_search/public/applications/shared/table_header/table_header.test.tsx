/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';

import { TableHeader } from './table_header';

const headerItems = ['foo', 'bar', 'baz'];

describe('TableHeader', () => {
  it('renders', () => {
    const wrapper = shallow(<TableHeader headerItems={headerItems} />);

    expect(wrapper.find(EuiTableHeader)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(3);
  });

  it('renders extra cell', () => {
    const wrapper = shallow(<TableHeader headerItems={headerItems} extraCell />);

    expect(wrapper.find(EuiTableHeader)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(4);
  });
});
