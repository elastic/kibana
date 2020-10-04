/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { LogicButtons } from './logic_buttons';

describe('LogicButtons', () => {
  test('it renders "and" and "or" buttons', () => {
    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="andButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="orButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="nestedButton"] button')).toHaveLength(0);
  });

  test('it invokes "onOrClicked" when "or" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={onOrClicked}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="orButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "and" button is clicked and "isNested" is "false"', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={onAndClicked}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="andButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAddClickWhenNested" when "and" button is clicked and "isNested" is "true"', () => {
    const onAddClickWhenNested = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested
        showNestedButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={onAddClickWhenNested}
      />
    );

    wrapper.find('[data-test-subj="andButton"] button').simulate('click');

    expect(onAddClickWhenNested).toHaveBeenCalledTimes(1);
  });

  test('it disables "and" button if "isAndDisabled" is true', () => {
    const wrapper = mount(
      <LogicButtons
        showNestedButton={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        isAndDisabled
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    const andButton = wrapper.find('[data-test-subj="andButton"] button').at(0);

    expect(andButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "or" button if "isOrDisabled" is "true"', () => {
    const wrapper = mount(
      <LogicButtons
        showNestedButton={false}
        isOrDisabled
        isAndDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    const orButton = wrapper.find('[data-test-subj="orButton"] button').at(0);

    expect(orButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "add nested" button if "isNestedDisabled" is "true"', () => {
    const wrapper = mount(
      <LogicButtons
        showNestedButton
        isOrDisabled={false}
        isAndDisabled={false}
        isNestedDisabled
        isNested={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    const nestedButton = wrapper.find('[data-test-subj="nestedButton"] button').at(0);

    expect(nestedButton.prop('disabled')).toBeTruthy();
  });

  test('it invokes "onNestedClicked" when "isNested" is "false" and "nested" button is clicked', () => {
    const onNestedClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={onNestedClicked}
        onAddClickWhenNested={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="nestedButton"] button').simulate('click');

    expect(onNestedClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "isNested" is "true" and "nested" button is clicked', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isNestedDisabled={false}
        isNested
        showNestedButton
        onOrClicked={jest.fn()}
        onAndClicked={onAndClicked}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="nestedButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });
});
