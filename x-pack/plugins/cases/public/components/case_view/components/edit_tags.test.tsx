/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { EditTagsProps } from './edit_tags';
import { EditTags } from './edit_tags';
import { readCasesPermissions, createAppMockRenderer } from '../../../common/mock';
import type { AppMockRenderer } from '../../../common/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { MAX_LENGTH_PER_TAG } from '../../../../common/constants';

jest.mock('../../../containers/use_get_tags');

const onSubmit = jest.fn();
const defaultProps: EditTagsProps = {
  isLoading: false,
  onSubmit,
  tags: [],
};

describe('EditTags ', () => {
  let appMockRender: AppMockRenderer;

  const sampleTags = ['coke', 'pepsi'];
  const fetchTags = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    (useGetTags as jest.Mock).mockImplementation(() => ({
      data: sampleTags,
      refetch: fetchTags,
    }));

    appMockRender = createAppMockRenderer();
  });

  it('renders no tags message', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    expect(await screen.findByTestId('no-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('tag-list-edit-button')).toBeInTheDocument();
  });

  it('edit tag from options on submit', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    userEvent.paste(await screen.findByRole('combobox'), `${sampleTags[0]}`);
    userEvent.keyboard('{enter}');

    userEvent.click(await screen.findByTestId('edit-tags-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith([sampleTags[0]]));
  });

  it('add new tags on submit', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    expect(await screen.findByTestId('edit-tags')).toBeInTheDocument();

    userEvent.paste(await screen.findByRole('combobox'), 'dude');
    userEvent.keyboard('{enter}');

    userEvent.click(await screen.findByTestId('edit-tags-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(['dude']));
  });

  it('trims the tags on submit', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    expect(await screen.findByTestId('edit-tags')).toBeInTheDocument();

    userEvent.paste(await screen.findByRole('combobox'), 'dude      ');
    userEvent.keyboard('{enter}');

    userEvent.click(await screen.findByTestId('edit-tags-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(['dude']));
  });

  it('cancels on cancel', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    userEvent.paste(await screen.findByRole('combobox'), 'new');
    userEvent.keyboard('{enter}');

    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('new');

    userEvent.click(await screen.findByTestId('edit-tags-cancel'));

    await waitFor(() => {
      expect(onSubmit).not.toBeCalled();
    });

    expect(await screen.findByTestId('no-tags')).toBeInTheDocument();
  });

  it('shows error when tag is empty', async () => {
    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    expect(await screen.findByTestId('edit-tags')).toBeInTheDocument();

    userEvent.paste(await screen.findByRole('combobox'), ' ');
    userEvent.keyboard('{enter}');

    expect(await screen.findByText('A tag must contain at least one non-space character.'));
  });

  it('shows error when tag is too long', async () => {
    const longTag = 'z'.repeat(MAX_LENGTH_PER_TAG + 1);

    appMockRender.render(<EditTags {...defaultProps} />);

    userEvent.click(await screen.findByTestId('tag-list-edit-button'));

    expect(await screen.findByTestId('edit-tags')).toBeInTheDocument();

    userEvent.paste(await screen.findByRole('combobox'), `${longTag}`);
    userEvent.keyboard('{enter}');

    expect(
      await screen.findByText(
        'The length of the tag is too long. The maximum length is 256 characters.'
      )
    );
  });

  it('does not render when the user does not have update permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });
    appMockRender.render(<EditTags {...defaultProps} />);

    expect(screen.queryByTestId('tag-list-edit')).not.toBeInTheDocument();
  });
});
