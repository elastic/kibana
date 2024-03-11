/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { UserActionMarkdown } from './markdown_form';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const hyperlink = `[hyperlink](http://elastic.co)`;
const draftStorageKey = `cases.securitySolution.caseId.markdown-id.markdownEditor`;
const defaultProps = {
  content: `A link to a timeline ${hyperlink}`,
  id: 'markdown-id',
  caseId: 'caseId',
  isEditable: true,
  draftStorageKey,
  onChangeEditable,
  onSaveContent,
};

describe('UserActionMarkdown ', () => {
  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('Renders markdown correctly when not in edit mode', async () => {
    appMockRenderer.render(<UserActionMarkdown {...{ ...defaultProps, isEditable: false }} />);

    expect(screen.getByTestId('scrollable-markdown')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-link')).toBeInTheDocument();
    expect(screen.queryByTestId('editable-save-markdown')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editable-cancel-markdown')).not.toBeInTheDocument();
  });

  it('Renders markdown correctly when in edit mode', async () => {
    appMockRenderer.render(<UserActionMarkdown {...{ ...defaultProps, isEditable: true }} />);

    expect(screen.getByTestId('editable-save-markdown')).toBeInTheDocument();
    expect(screen.getByTestId('editable-cancel-markdown')).toBeInTheDocument();
  });

  describe('errors', () => {
    it('Shows error message and save button disabled if current text is empty', async () => {
      appMockRenderer.render(<UserActionMarkdown {...{ ...defaultProps, isEditable: true }} />);

      userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));

      userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), '');

      await waitFor(() => {
        expect(screen.getByText('Empty comments are not allowed.')).toBeInTheDocument();
        expect(screen.getByTestId('editable-save-markdown')).toHaveProperty('disabled');
      });
    });

    it('Shows error message and save button disabled if current text is of empty characters', async () => {
      appMockRenderer.render(<UserActionMarkdown {...{ ...defaultProps, isEditable: true }} />);

      userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));

      userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), '  ');

      await waitFor(() => {
        expect(screen.getByText('Empty comments are not allowed.')).toBeInTheDocument();
        expect(screen.getByTestId('editable-save-markdown')).toHaveProperty('disabled');
      });
    });

    it('Shows error message and save button disabled if current text is too long', async () => {
      const longComment = 'b'.repeat(MAX_COMMENT_LENGTH + 1);

      appMockRenderer.render(<UserActionMarkdown {...{ ...defaultProps, isEditable: true }} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      userEvent.paste(markdown, longComment);

      await waitFor(() => {
        expect(
          screen.getByText(
            'The length of the comment is too long. The maximum length is 30000 characters.'
          )
        ).toBeInTheDocument();
        expect(screen.getByTestId('editable-save-markdown')).toHaveProperty('disabled');
      });
    });
  });

  describe('useForm stale state bug', () => {
    const oldContent = defaultProps.content;
    const appendContent = ' appended content';
    const newContent = defaultProps.content + appendContent;

    it("doesn't create a stale state if a key is passed to the component", async () => {
      const TestComponent = () => {
        const [isEditable, setIsEditable] = React.useState(true);
        const [saveContent, setSaveContent] = React.useState(defaultProps.content);
        return (
          <div>
            <UserActionMarkdown
              {...defaultProps}
              content={saveContent}
              isEditable={isEditable}
              onSaveContent={setSaveContent}
              // this is the important change. a key is passed to the component
              key={isEditable ? 'key' : 'no-key'}
            />
            <button
              type="button"
              data-test-subj="test-button"
              onClick={() => {
                setIsEditable(!isEditable);
              }}
            />
          </div>
        );
      };
      const result = appMockRenderer.render(<TestComponent />);
      expect(result.getByTestId('editable-markdown-form')).toBeTruthy();

      // append content and save
      userEvent.type(result.container.querySelector('textarea')!, appendContent);
      userEvent.click(result.getByTestId('editable-save-markdown'));

      // wait for the state to update
      await waitFor(() => {
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
      });

      // toggle to non-edit state
      userEvent.click(result.getByTestId('test-button'));
      expect(result.getByTestId('scrollable-markdown')).toBeTruthy();

      // toggle to edit state again
      userEvent.click(result.getByTestId('test-button'));

      // this is the correct behaviour. The textarea holds the new content
      expect(result.container.querySelector('textarea')!.value).toEqual(newContent);
      expect(result.container.querySelector('textarea')!.value).not.toEqual(oldContent);
    });
  });
});
