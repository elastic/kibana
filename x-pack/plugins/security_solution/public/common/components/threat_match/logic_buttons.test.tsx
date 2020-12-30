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
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="andButton"] button')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="orButton"] button')).toHaveLength(1);
  });

  test('it invokes "onOrClicked" when "or" button is clicked', () => {
    const onOrClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        onOrClicked={onOrClicked}
        onAndClicked={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="orButton"] button').simulate('click');

    expect(onOrClicked).toHaveBeenCalledTimes(1);
  });

  test('it invokes "onAndClicked" when "and" button is clicked', () => {
    const onAndClicked = jest.fn();

    const wrapper = mount(
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        onOrClicked={jest.fn()}
        onAndClicked={onAndClicked}
      />
    );

    wrapper.find('[data-test-subj="andButton"] button').simulate('click');

    expect(onAndClicked).toHaveBeenCalledTimes(1);
  });

  test('it disables "and" button if "isAndDisabled" is true', () => {
    const wrapper = mount(
      <LogicButtons
        isOrDisabled={false}
        isAndDisabled
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
      />
    );

    const andButton = wrapper.find('[data-test-subj="andButton"] button').at(0);

    expect(andButton.prop('disabled')).toBeTruthy();
  });

  test('it disables "or" button if "isOrDisabled" is "true"', () => {
    const wrapper = mount(
      <LogicButtons
        isOrDisabled
        isAndDisabled={false}
        onOrClicked={jest.fn()}
        onAndClicked={jest.fn()}
      />
    );

    const orButton = wrapper.find('[data-test-subj="orButton"] button').at(0);

    expect(orButton.prop('disabled')).toBeTruthy();
  });
});
