/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { AndOrExceptionOperator } from './and_or_operator';

describe('AndOrExceptionOperator', () => {
  test('it renders "and" and "or" buttons', () => {
    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onAddExceptionClicked={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAndButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="exceptionsOrButton"] button')).toHaveLength(1);
  });

  test('it renders "add exception" button if "displayInitButton" is true', () => {
    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={true}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onAddExceptionClicked={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button')).toHaveLength(
      1
    );
  });

  test('it invokes "onAddExceptionClicked" when "add exception" button is clicked', () => {
    const onAddExceptionClicked = jest.fn();

    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={true}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onAddExceptionClicked={onAddExceptionClicked}
      />
    );

    wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button').simulate('click');

    expect(onAddExceptionClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onOrClicked" when "or" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={false}
        onOrClicked={onOrClicked}
        onAndClicked={jest.fn()}
        onAddExceptionClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "and" button is clicked', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={onAndClicked}
        onAddExceptionClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });

  test('it disables "and" button if "isAndDisabled" is true', () => {
    const wrapper = mount(
      <AndOrExceptionOperator
        displayInitButton={false}
        isAndDisabled
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onAddExceptionClicked={jest.fn()}
      />
    );

    const andButton = wrapper.find('[data-test-subj="exceptionsAndButton"] button').at(0);

    expect(andButton.prop('disabled')).toBeTruthy();
  });
});
