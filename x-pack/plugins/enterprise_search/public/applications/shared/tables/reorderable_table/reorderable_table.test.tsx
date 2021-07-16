/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { BodyRows } from './body_rows';
import { ReorderableTable } from './reorderable_table';
import { Column } from './types';

interface Foo {
  id: number;
}

describe('ReorderableTable', () => {
  it('renders a table with a header and rows', () => {
    const items: Foo[] = [];
    const columns: Array<Column<Foo>> = [];
    const wrapper = shallow(<ReorderableTable items={items} columns={columns} />);
    const bodyRows = wrapper.find(BodyRows);
    expect(bodyRows.exists()).toBe(true);
    expect(bodyRows.prop('items')).toEqual(items);
    expect(bodyRows.prop('columns')).toEqual(columns);
  });

  it('appends an additional className if specified', () => {
    const wrapper = shallow(<ReorderableTable items={[]} columns={[]} className="foo" />);
    expect(wrapper.hasClass('foo')).toBe(true);
  });
});
