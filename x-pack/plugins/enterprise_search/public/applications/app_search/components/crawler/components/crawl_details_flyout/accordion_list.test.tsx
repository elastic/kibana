/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion, EuiIcon, EuiTitle, EuiInMemoryTable } from '@elastic/eui';

import { AccordionList } from './accordion_list';

const MOCK_PROPS = {
  title: 'Test Items',
  iconType: 'globe',
  items: ['first item', 'second item'],
};

describe('AccordionList', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<AccordionList {...MOCK_PROPS} />);
  });

  it('renders as an accordion with the passed in title and icon', () => {
    expect(wrapper.is(EuiAccordion)).toBe(true);

    const buttonContent = shallow(wrapper.prop('buttonContent'));

    expect(buttonContent.find(EuiIcon).prop('type')).toEqual('globe');
    expect(buttonContent.find(EuiTitle).children().text()).toEqual('Test Items');
  });

  it('shows the item count', () => {
    const extraActionContent = shallow(wrapper.prop('extraAction'));

    expect(extraActionContent.text()).toEqual('2');
  });

  it('contains an table displaying the items', () => {
    const table = wrapper.find(EuiInMemoryTable);

    expect(table.prop('items')).toEqual([{ item: 'first item' }, { item: 'second item' }]);

    // columns from accordion_list.tsx always have a render function, so avoid type errors and just convert to any
    const column: any = table.prop('columns')[0];
    expect(column.render({ item: 'first item' })).toEqual('first item');
  });

  it('is disabled when there are no items', () => {
    const disabledWrapper = shallow(<AccordionList {...{ ...MOCK_PROPS, items: [] }} />);

    expect(disabledWrapper.prop('arrowProps').isDisabled).toEqual(true);
  });
});
