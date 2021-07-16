/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { BodyRow } from './body_row';
import { BodyRows } from './body_rows';
import { Column } from './types';

interface Foo {
  id: number;
}

describe('BodyRows', () => {
  it('renders a row for each provided item', () => {
    const columns: Array<Column<Foo>> = [];
    const wrapper = shallow(<BodyRows items={[{ id: 1 }, { id: 2 }]} columns={columns} />);
    const rows = wrapper.find(BodyRow);
    expect(rows.length).toBe(2);

    expect(rows.at(0).props()).toEqual({
      additionalProps: {},
      columns,
      item: { id: 1 },
    });

    expect(rows.at(1).props()).toEqual({
      additionalProps: {},
      columns,
      item: { id: 2 },
    });
  });

  it('can append additional properties to each row, which can be dynamically calculated from the item in that row', () => {
    const columns: Array<Column<Foo>> = [];
    const rowProps = (item: Foo) => ({
      isFirst: item.id === 1,
      foo: 'foo',
    });

    const wrapper = shallow(
      <BodyRows items={[{ id: 1 }, { id: 2 }]} columns={columns} rowProps={rowProps} />
    );
    const rows = wrapper.find(BodyRow);

    expect(rows.at(0).prop('additionalProps')).toEqual({
      isFirst: true,
      foo: 'foo',
    });

    expect(rows.at(1).prop('additionalProps')).toEqual({
      isFirst: false,
      foo: 'foo',
    });
  });
});
