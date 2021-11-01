/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { BuilderLogicButtons } from './logic_buttons';

describe('BuilderLogicButtons', () => {
  test('it renders "and" and "or" buttons', () => {
    const wrapper = mount(
      <BuilderLogicButtons
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

    expect(wrapper.find('[data-test-subj="exceptionsAndButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="exceptionsOrButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button')).toHaveLength(
      0
    );
    expect(wrapper.find('[data-test-subj="exceptionsNestedButton"] button')).toHaveLength(0);
  });

  test('it hides "or" button', () => {
    const wrapper = mount(
      <BuilderLogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        isOrHidden={true}
        isNestedDisabled={false}
        isNested={false}
        showNestedButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
        onAddClickWhenNested={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsOrButton"] button')).toHaveLength(0);
  });

  test('it invokes "onOrClicked" when "or" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <BuilderLogicButtons
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

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "and" button is clicked and "isNested" is "false"', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <BuilderLogicButtons
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

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAddClickWhenNested" when "and" button is clicked and "isNested" is "true"', () => {
    const onAddClickWhenNested = jest.fn();

    const wrapper = mount(
      <BuilderLogicButtons
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

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(onAddClickWhenNested).toHaveBeenCalledTimes(1);
  });

  test('it disables "and" button if "isAndDisabled" is true', () => {
    const wrapper = mount(
      <BuilderLogicButtons
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

    const andButton = wrapper.find('[data-test-subj="exceptionsAndButton"] button').at(0);

    expect(andButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "or" button if "isOrDisabled" is "true"', () => {
    const wrapper = mount(
      <BuilderLogicButtons
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

    const orButton = wrapper.find('[data-test-subj="exceptionsOrButton"] button').at(0);

    expect(orButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "add nested" button if "isNestedDisabled" is "true"', () => {
    const wrapper = mount(
      <BuilderLogicButtons
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

    const nestedButton = wrapper.find('[data-test-subj="exceptionsNestedButton"] button').at(0);

    expect(nestedButton.prop('disabled')).toBeTruthy();
  });

  test('it invokes "onNestedClicked" when "isNested" is "false" and "nested" button is clicked', () => {
    const onNestedClicked = jest.fn();

    const wrapper = mount(
      <BuilderLogicButtons
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

    wrapper.find('[data-test-subj="exceptionsNestedButton"] button').simulate('click');

    expect(onNestedClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "isNested" is "true" and "nested" button is clicked', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <BuilderLogicButtons
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

    wrapper.find('[data-test-subj="exceptionsNestedButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });
});
