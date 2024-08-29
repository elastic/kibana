/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { waitFor, fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from '../../common/translations';

const { emptyField, maxLengthField } = fieldValidators;

import { EditableMarkdown } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('../../common/lib/kibana');

const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const newValue = 'Hello from Tehas';
const hyperlink = `[hyperlink](http://elastic.co)`;
const draftStorageKey = `cases.securitySolution.caseId.markdown-id.markdownEditor`;
const content = `A link to a timeline ${hyperlink}`;
const maxLength = 5000;

const mockSchema: FormSchema<{ content: string }> = {
  content: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD),
      },
      {
        validator: maxLengthField({
          length: maxLength,
          message: i18n.MAX_LENGTH_ERROR('textarea', maxLength),
        }),
      },
    ],
  },
};

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
  formSchema: mockSchema,
  editorRef,
};

describe('EditableMarkdown', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
  });

  it('Save button click calls onSaveContent and onChangeEditable when text area value changed', async () => {
    appMockRender.render(<EditableMarkdown {...defaultProps} />);

    fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
      target: { value: newValue },
    });

    userEvent.click(await screen.findByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onSaveContent).toHaveBeenCalledWith(newValue);
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  it('Does not call onSaveContent if no change from current text', async () => {
    appMockRender.render(<EditableMarkdown {...defaultProps} />);

    userEvent.click(await screen.findByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });

  it('Cancel button click calls only onChangeEditable', async () => {
    appMockRender.render(<EditableMarkdown {...defaultProps} />);

    userEvent.click(await screen.findByTestId('editable-cancel-markdown'));

    await waitFor(() => {
      expect(onSaveContent).not.toHaveBeenCalled();
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('errors', () => {
    it('Shows error message and save button disabled if current text is empty', async () => {
      appMockRender.render(<EditableMarkdown {...defaultProps} />);

      userEvent.clear(await screen.findByTestId('euiMarkdownEditorTextArea'));
      userEvent.paste(await screen.findByTestId('euiMarkdownEditorTextArea'), '');

      expect(await screen.findByText('Required field')).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });

    it('Shows error message and save button disabled if current text is of empty characters', async () => {
      appMockRender.render(<EditableMarkdown {...defaultProps} />);

      userEvent.clear(await screen.findByTestId('euiMarkdownEditorTextArea'));
      userEvent.paste(await screen.findByTestId('euiMarkdownEditorTextArea'), '  ');

      expect(await screen.findByText('Required field')).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });

    it('Shows error message and save button disabled if current text is too long', async () => {
      const longComment = 'b'.repeat(maxLength + 1);

      appMockRender.render(<EditableMarkdown {...defaultProps} />);

      const markdown = await screen.findByTestId('euiMarkdownEditorTextArea');

      userEvent.paste(markdown, longComment);

      expect(
        await screen.findByText(
          `The length of the textarea is too long. The maximum length is ${maxLength} characters.`
        )
      ).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
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
      appMockRender.render(<EditableMarkdown {...defaultProps} />);

      fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);

      fireEvent.click(await screen.findByTestId(`editable-save-markdown`));

      await waitFor(() => {
        expect(onSaveContent).toHaveBeenCalledWith(newValue);
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    it('Cancel button click clears session storage', async () => {
      appMockRender.render(<EditableMarkdown {...defaultProps} />);

      expect(sessionStorage.getItem(draftStorageKey)).toBe('');

      fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);
      });

      fireEvent.click(await screen.findByTestId('editable-cancel-markdown'));

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    describe('existing storage key', () => {
      beforeEach(() => {
        sessionStorage.setItem(draftStorageKey, 'value set in storage');
      });

      it('should have session storage value same as draft comment', async () => {
        appMockRender.render(<EditableMarkdown {...defaultProps} />);

        expect(await screen.findByText('value set in storage')).toBeInTheDocument();
      });
    });
  });
});
