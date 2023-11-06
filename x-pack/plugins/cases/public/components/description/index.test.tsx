/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicCase } from '../../containers/mock';

import { Description } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noUpdateCasesPermissions, TestProviders } from '../../common/mock';
import { MAX_DESCRIPTION_LENGTH } from '../../../common/constants';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const defaultProps = {
  appId: 'testAppId',
  caseData: {
    ...basicCase,
  },
  isLoadingDescription: false,
};

describe('Description', () => {
  const onUpdateField = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders description correctly', async () => {
    appMockRender.render(<Description {...defaultProps} onUpdateField={onUpdateField} />);

    expect(screen.getByTestId('description')).toBeInTheDocument();
    expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
  });

  it('hides and shows the description correctly when collapse button clicked', async () => {
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-collapse-icon'));

    await waitFor(() => {
      expect(screen.queryByText('Security banana Issue')).not.toBeInTheDocument();
    });

    userEvent.click(res.getByTestId('description-collapse-icon'));

    expect(await screen.findByText('Security banana Issue')).toBeInTheDocument();
  });

  it('shows textarea on edit click', async () => {
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    expect(await screen.findByTestId('euiMarkdownEditorTextArea')).toBeInTheDocument();
  });

  it('edits the description correctly when saved', async () => {
    const editedDescription = 'New updated description';
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.paste(screen.getByTestId('euiMarkdownEditorTextArea'), editedDescription);

    userEvent.click(screen.getByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onUpdateField).toHaveBeenCalledWith({
        key: 'description',
        value: editedDescription,
      });
    });
  });

  it('keeps the old description correctly when canceled', async () => {
    const editedDescription = 'New updated description';
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.paste(screen.getByTestId('euiMarkdownEditorTextArea'), editedDescription);

    expect(screen.getByText(editedDescription)).toBeInTheDocument();

    userEvent.click(screen.getByTestId('editable-cancel-markdown'));

    await waitFor(() => {
      expect(onUpdateField).not.toHaveBeenCalled();
    });

    expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
  });

  it('shows an error when description is too long', async () => {
    const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);

    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.paste(screen.getByTestId('euiMarkdownEditorTextArea'), longDescription);

    expect(
      await screen.findByText(
        'The length of the description is too long. The maximum length is 30000 characters.'
      )
    ).toBeInTheDocument();

    expect(await screen.findByTestId('editable-save-markdown')).toHaveAttribute('disabled');
  });

  it('should hide the edit button when the user does not have update permissions', () => {
    appMockRender.render(
      <TestProviders permissions={noUpdateCasesPermissions()}>
        <Description {...defaultProps} onUpdateField={onUpdateField} />
      </TestProviders>
    );

    expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
    expect(screen.queryByTestId('description-edit-icon')).not.toBeInTheDocument();
  });

  describe('draft message', () => {
    const draftStorageKey = `cases.testAppId.basic-case-id.description.markdownEditor`;

    beforeEach(() => {
      sessionStorage.setItem(draftStorageKey, 'value set in storage');
    });

    it('should not show unsaved draft message when loading', async () => {
      appMockRender.render(
        <Description {...defaultProps} onUpdateField={onUpdateField} isLoadingDescription={true} />
      );

      expect(screen.queryByTestId('description-unsaved-draft')).not.toBeInTheDocument();
    });

    it('should not show unsaved draft message when description and storage value are same', async () => {
      const props = {
        ...defaultProps,
        caseData: { ...defaultProps.caseData, description: 'value set in storage' },
      };

      appMockRender.render(<Description {...props} onUpdateField={onUpdateField} />);

      expect(screen.queryByTestId('description-unsaved-draft')).not.toBeInTheDocument();
    });
  });
});
