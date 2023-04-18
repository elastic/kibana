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
import { userProfilesMap } from '../../containers/user_profiles/api.mock';

import { Description } from '.';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const defaultProps = {
  appId: 'testAppId',
  isLoadingDescription: false,
  caseData: {
    ...basicCase,
  },
  userProfiles: userProfilesMap,
};

describe('Description ', () => {
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

  it('renders loading state correctly', async () => {
    appMockRender.render(
      <Description {...defaultProps} isLoadingDescription={true} onUpdateField={onUpdateField} />
    );

    expect(screen.getByTestId('description-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('description')).not.toBeInTheDocument();
    expect(screen.queryByText('Security banana Issue')).not.toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
    });
  });

  it('shows textarea on edit click', async () => {
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toBeInTheDocument();
    });
  });

  it('edits the description correctly when saved', async () => {
    const editedDescription = 'New updated description';
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), editedDescription);

    userEvent.click(screen.getByTestId('user-action-save-markdown'));

    await waitFor(() => {
      expect(onUpdateField).toHaveBeenCalledWith({ key: 'description', value: editedDescription });
    });
  });

  it('keeps the old description correctly when canceled', async () => {
    const editedDescription = 'New updated description';
    const res = appMockRender.render(
      <Description {...defaultProps} onUpdateField={onUpdateField} />
    );

    userEvent.click(res.getByTestId('description-edit-icon'));

    userEvent.clear(screen.getByTestId('euiMarkdownEditorTextArea'));
    userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), editedDescription);

    userEvent.click(screen.getByTestId('user-action-cancel-markdown'));

    await waitFor(() => {
      expect(onUpdateField).not.toHaveBeenCalled();
      expect(screen.getByText('Security banana Issue')).toBeInTheDocument();
    });
  });
});
