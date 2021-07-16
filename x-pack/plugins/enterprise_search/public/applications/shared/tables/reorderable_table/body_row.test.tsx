/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { BodyRow } from './body_row';
import { Cell } from './cell';

describe('BodyRow', () => {
  it('renders a table row from the provided item and columns', () => {
    const wrapper = shallow(
      <BodyRow
        columns={[
          {
            name: 'ID',
            flexBasis: 'foo',
            flexGrow: 0,
            alignItems: 'bar',
            render: (item) => item.id,
          },
          {
            name: 'Whatever',
            render: () => 'Whatever',
          },
        ]}
        item={{ id: 1 }}
      />
    );

    const cells = wrapper.find(Cell);
    expect(cells.length).toBe(2);

    expect(cells.at(0).props()).toEqual({
      alignItems: 'bar',
      children: 1,
      flexBasis: 'foo',
      flexGrow: 0,
    });

    expect(cells.at(1).props()).toEqual({
      children: 'Whatever',
    });
  });
});
