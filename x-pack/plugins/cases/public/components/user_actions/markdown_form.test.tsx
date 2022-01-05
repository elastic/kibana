/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { UserActionMarkdown } from './markdown_form';
import { TestProviders } from '../../common/mock';
import { waitFor } from '@testing-library/react';
const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const newValue = 'Hello from Tehas';
const hyperlink = `[hyperlink](http://elastic.co)`;
const defaultProps = {
  content: `A link to a timeline ${hyperlink}`,
  id: 'markdown-id',
  isEditable: true,
  onChangeEditable,
  onSaveContent,
};

describe('UserActionMarkdown ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Renders markdown correctly when not in edit mode', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...{ ...defaultProps, isEditable: false }} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="markdown-link"]`).first().text()).toContain('hyperlink');
  });

  it('Save button click calls onSaveContent and onChangeEditable when text area value changed', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find(`.euiMarkdownEditorTextArea`)
      .first()
      .simulate('change', {
        target: { value: newValue },
      });

    wrapper.find(`[data-test-subj="user-action-save-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onSaveContent).toHaveBeenCalledWith(newValue);
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });
  it('Does not call onSaveContent if no change from current text', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="user-action-save-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });
  it('Cancel button click calls only onChangeEditable', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="user-action-cancel-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onSaveContent).not.toHaveBeenCalled();
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });
});
