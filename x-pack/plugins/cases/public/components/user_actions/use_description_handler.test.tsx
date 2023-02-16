/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { useUpdateComment } from '../../containers/use_update_comment';
import { basicCase } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { UseDescriptionHandler } from './use_description_handler';
import { waitForComponentToUpdate } from '../../common/test_utils';

const onUpdateField = jest.fn();

const defaultProps = {
  data: basicCase,
  onUpdateField,
  isLoadingDescription: false,
};

jest.mock('../../containers/use_update_comment');
jest.mock('./timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');

const useUpdateCommentMock = useUpdateComment as jest.Mock;
const patchComment = jest.fn();

describe(`UseDescriptionHandler`, () => {
  const sampleData = {
    content: 'what a great comment update',
  };
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCommentMock.mockReturnValue({
      isLoadingIds: [],
      patchComment,
    });

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
    appMockRender = createAppMockRenderer();
  });

  it('Loading spinner when description is loading', () => {
    appMockRender.render(<UseDescriptionHandler {...defaultProps} isLoadingDescription={true} />);

    expect(screen.getByTestId('description-loading')).toBeInTheDocument();
  });

  it('calls update description when description markdown is saved', async () => {
    const newData = {
      content: 'what a great comment update',
    };

    appMockRender.render(<UseDescriptionHandler {...defaultProps} />);

    userEvent.click(screen.getByTestId('editable-description-edit-icon'));

    userEvent.clear(screen.getAllByTestId('euiMarkdownEditorTextArea')[0]);

    userEvent.type(screen.getAllByTestId('euiMarkdownEditorTextArea')[0], newData.content);

    userEvent.click(screen.getByTestId('user-action-save-markdown'));

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(screen.queryByTestId('user-action-markdown-form')).not.toBeInTheDocument();
      expect(onUpdateField).toBeCalledWith({ key: 'description', value: sampleData.content });
    });
  });
});
