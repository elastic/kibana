/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { waitFor, fireEvent, screen, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditableMarkdown } from '.';
import { TestProviders } from '../../common/mock';
import type { Content } from '../user_actions/schema';
import { schema } from '../user_actions/schema';

jest.mock('../../common/lib/kibana');

const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const newValue = 'Hello from Tehas';
const emptyValue = '';
const hyperlink = `[hyperlink](http://elastic.co)`;
const draftStorageKey = `cases.testAppId.caseId.markdown-id.markdownEditor`;
const content = `A link to a timeline ${hyperlink}`;

const editorRef: React.MutableRefObject<null | undefined> = { current: null };
const defaultProps = {
  content,
  id: 'markdown-id',
  caseId: 'caseId',
  isEditable: true,
  draftStorageKey,
  onChangeEditable,
  onSaveContent,
  fieldName: 'content',
  formSchema: schema,
  editorRef,
};

describe('EditableMarkdown', () => {
  const MockHookWrapperComponent: React.FC<{ testProviderProps?: unknown }> = ({
    children,
    testProviderProps = {},
  }) => {
    const { form } = useForm<Content>({
      defaultValue: { content },
      options: { stripEmptyFields: false },
      schema,
    });

    return (
      <TestProviders {...testProviderProps}>
        <Form form={form}>{children}</Form>
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('Save button click calls onSaveContent and onChangeEditable when text area value changed', async () => {
    render(
      <MockHookWrapperComponent>
        <EditableMarkdown {...defaultProps} />
      </MockHookWrapperComponent>
    );

    fireEvent.change(screen.getByTestId('euiMarkdownEditorTextArea'), {
      target: { value: newValue },
    });

    userEvent.click(screen.getByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onSaveContent).toHaveBeenCalledWith(newValue);
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  it('Does not call onSaveContent if no change from current text', async () => {
    render(
      <MockHookWrapperComponent>
        <EditableMarkdown {...defaultProps} />
      </MockHookWrapperComponent>
    );

    userEvent.click(screen.getByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });

  it('Save button disabled if current text is empty', async () => {
    render(
      <MockHookWrapperComponent>
        <EditableMarkdown {...defaultProps} />
      </MockHookWrapperComponent>
    );

    fireEvent.change(screen.getByTestId('euiMarkdownEditorTextArea'), { value: emptyValue });

    await waitFor(() => {
      expect(screen.getByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });
  });

  it('Cancel button click calls only onChangeEditable', async () => {
    render(
      <MockHookWrapperComponent>
        <EditableMarkdown {...defaultProps} />
      </MockHookWrapperComponent>
    );

    userEvent.click(screen.getByTestId('editable-cancel-markdown'));

    await waitFor(() => {
      expect(onSaveContent).not.toHaveBeenCalled();
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('draft comment ', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
      sessionStorage.removeItem(draftStorageKey);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Save button click clears session storage', async () => {
      const result = render(
        <MockHookWrapperComponent>
          <EditableMarkdown {...defaultProps} />
        </MockHookWrapperComponent>
      );

      fireEvent.change(result.getByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);

      fireEvent.click(result.getByTestId(`editable-save-markdown`));

      await waitFor(() => {
        expect(onSaveContent).toHaveBeenCalledWith(newValue);
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    it('Cancel button click clears session storage', async () => {
      const result = render(
        <MockHookWrapperComponent>
          <EditableMarkdown {...defaultProps} />
        </MockHookWrapperComponent>
      );

      expect(sessionStorage.getItem(draftStorageKey)).toBe('');

      fireEvent.change(result.getByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);
      });

      fireEvent.click(result.getByTestId('editable-cancel-markdown'));

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    describe('existing storage key', () => {
      beforeEach(() => {
        sessionStorage.setItem(draftStorageKey, 'value set in storage');
      });

      it('should have session storage value same as draft comment', async () => {
        const result = render(
          <MockHookWrapperComponent>
            <EditableMarkdown {...defaultProps} />
          </MockHookWrapperComponent>
        );

        expect(result.getByText('value set in storage')).toBeInTheDocument();
      });
    });
  });
});
