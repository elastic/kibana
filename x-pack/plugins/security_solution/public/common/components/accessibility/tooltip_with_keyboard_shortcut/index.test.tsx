/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TooltipWithKeyboardShortcut } from '.';

const props = {
  content: <div>{'To pay respect'}</div>,
  shortcut: 'F',
  showShortcut: true,
};

describe('TooltipWithKeyboardShortcut', () => {
  test('it renders the provided content', () => {
    const wrapper = mount(<TooltipWithKeyboardShortcut {...props} />);

    expect(wrapper.find('[data-test-subj="content"]').text()).toBe('To pay respect');
  });

  test('it renders the additionalScreenReaderOnlyContext', () => {
    const wrapper = mount(
      <TooltipWithKeyboardShortcut {...props} additionalScreenReaderOnlyContext={'field.name'} />
    );

    expect(wrapper.find('[data-test-subj="additionalScreenReaderOnlyContext"]').text()).toBe(
      'field.name'
    );
  });

  test('it renders the expected shortcut', () => {
    const wrapper = mount(<TooltipWithKeyboardShortcut {...props} />);

    expect(wrapper.find('[data-test-subj="shortcut"]').first().text()).toBe('Press\u00a0F');
  });
});
