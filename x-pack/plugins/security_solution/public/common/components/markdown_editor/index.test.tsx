/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { MarkdownEditor } from '.';
import { TestProviders } from '../../mock';

describe('Markdown Editor', () => {
  const onChange = jest.fn();
  const onCursorPositionUpdate = jest.fn();
  const defaultProps = {
    content: 'hello world',
    onChange,
    onCursorPositionUpdate,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('it calls onChange with correct value', () => {
    const wrapper = mount(
      <TestProviders>
        <MarkdownEditor {...defaultProps} />
      </TestProviders>
    );
    const newValue = 'a new string';
    wrapper
      .find(`[data-test-subj="textAreaInput"]`)
      .first()
      .simulate('change', { target: { value: newValue } });
    expect(onChange).toBeCalledWith(newValue);
  });
  test('it calls onCursorPositionUpdate with correct args', () => {
    const wrapper = mount(
      <TestProviders>
        <MarkdownEditor {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="textAreaInput"]`).first().simulate('blur');
    expect(onCursorPositionUpdate).toBeCalledWith({
      start: 0,
      end: 0,
    });
  });
});
