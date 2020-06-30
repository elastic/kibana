/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { BuilderButtonOptions } from './builder_button_options';

describe('BuilderButtonOptions', () => {
  test('it renders "and" and "or" buttons', () => {
    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAndButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="exceptionsOrButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button')).toHaveLength(
      0
    );
    expect(wrapper.find('[data-test-subj="exceptionsNestedButton"] button')).toHaveLength(0);
  });

  test('it renders "add exception" button if "displayInitButton" is true', () => {
    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button')).toHaveLength(
      1
    );
  });

  test('it invokes "onAddExceptionClicked" when "add exception" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton
        onOrClicked={onOrClicked}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="exceptionsAddNewExceptionButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onOrClicked" when "or" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={onOrClicked}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="exceptionsOrButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "and" button is clicked', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton={false}
        displayInitButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={onAndClicked}
        onNestedClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="exceptionsAndButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });

  test('it disables "and" button if "isAndDisabled" is true', () => {
    const wrapper = mount(
      <BuilderButtonOptions
        showNestedButton={false}
        displayInitButton={false}
        isOrDisabled={false}
        isAndDisabled
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    const andButton = wrapper.find('[data-test-subj="exceptionsAndButton"] button').at(0);

    expect(andButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "or" button if "isOrDisabled" is true', () => {
    const wrapper = mount(
      <BuilderButtonOptions
        showNestedButton={false}
        displayInitButton={false}
        isOrDisabled
        isAndDisabled={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={jest.fn()}
      />
    );

    const orButton = wrapper.find('[data-test-subj="exceptionsOrButton"] button').at(0);

    expect(orButton.prop('disabled')).toBeTruthy();
  });

  test('it invokes "onNestedClicked" when "and" button is clicked', () => {
    const onNestedClicked = jest.fn();

    const wrapper = mount(
      <BuilderButtonOptions
        isAndDisabled={false}
        isOrDisabled={false}
        showNestedButton
        displayInitButton={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
        onNestedClicked={onNestedClicked}
      />
    );

    wrapper.find('[data-test-subj="exceptionsNestedButton"] button').simulate('click');

    expect(onNestedClicked).toHaveBeenCalledTimes(1);
  });
});
