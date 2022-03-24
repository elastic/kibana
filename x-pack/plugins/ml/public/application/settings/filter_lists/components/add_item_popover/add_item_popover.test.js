/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { AddItemPopover } from './add_item_popover';

function prepareTest(addItemsFn) {
  const props = {
    addItems: addItemsFn,
    canCreateFilter: true,
  };

  const wrapper = shallowWithIntl(<AddItemPopover {...props} />);

  return wrapper;
}

describe('AddItemPopover', () => {
  test('renders the popover', () => {
    const addItems = jest.fn(() => {});
    const wrapper = prepareTest(addItems);
    expect(wrapper).toMatchSnapshot();
  });

  test('opens the popover onButtonClick', () => {
    const addItems = jest.fn(() => {});
    const wrapper = prepareTest(addItems);
    const instance = wrapper.instance();
    instance.onButtonClick();
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('calls addItems with one item on clicking Add button', () => {
    const addItems = jest.fn(() => {});
    const wrapper = prepareTest(addItems);
    wrapper.find('EuiTextArea').simulate('change', { target: { value: 'google.com' } });
    const instance = wrapper.instance();
    instance.onAddButtonClick();
    wrapper.update();
    expect(addItems).toHaveBeenCalledWith(['google.com']);
  });

  test('calls addItems with multiple items on clicking Add button', () => {
    const addItems = jest.fn(() => {});
    const wrapper = prepareTest(addItems);
    wrapper.find('EuiTextArea').simulate('change', { target: { value: 'google.com\nelastic.co' } });
    const instance = wrapper.instance();
    instance.onAddButtonClick();
    wrapper.update();
    expect(addItems).toHaveBeenCalledWith(['google.com', 'elastic.co']);
    expect(wrapper).toMatchSnapshot();
  });
});
