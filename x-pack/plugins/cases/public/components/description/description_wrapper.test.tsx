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
import { DescriptionWrapper } from './description_wrapper';
import { waitForComponentToUpdate } from '../../common/test_utils';

const onUpdateField = jest.fn();

const defaultProps = {
  data: basicCase,
  onUpdateField,
  isLoadingDescription: false,
  userProfiles: new Map(),
};

jest.mock('../../containers/use_update_comment');
jest.mock('../../common/lib/kibana');

const useUpdateCommentMock = useUpdateComment as jest.Mock;
const patchComment = jest.fn();

// FLAKY:
describe.skip(`DescriptionWrapper`, () => {
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

  it('renders correctly', () => {
    appMockRender.render(<DescriptionWrapper {...defaultProps} />);

    expect(screen.getByTestId('description-action')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    appMockRender.render(<DescriptionWrapper {...defaultProps} isLoadingDescription={true} />);

    expect(screen.getByTestId('description-loading')).toBeInTheDocument();
  });

  it('calls update description when description markdown is saved', async () => {
    const newData = {
      content: 'what a great comment update',
    };

    appMockRender.render(<DescriptionWrapper {...defaultProps} />);

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
