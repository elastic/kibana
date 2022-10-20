/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { EditTagsSelectable } from './edit_tags_selectable';
import { basicCase } from '../../../containers/mock';
import { waitForComponentToUpdate } from '../../../common/test_utils';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

describe('EditTagsSelectable', () => {
  let appMock: AppMockRenderer;
  const props = {
    selectedCases: [basicCase],
    isLoading: false,
    tags: ['one', 'two', ...basicCase.tags],
    onChangeTags: jest.fn(),
  };

  const propsMultipleCases = {
    selectedCases: [
      { ...basicCase, tags: [...basicCase.tags, 'one'] },
      { ...basicCase, tags: ['one', 'three'] },
    ],
    isLoading: false,
    tags: ['one', 'two', 'three', ...basicCase.tags],
    onChangeTags: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    expect(result.getByTestId('cases-actions-tags-edit-selectable')).toBeInTheDocument();
    expect(result.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(result.getByText(`${props.tags.length} tags`)).toBeInTheDocument();
    expect(result.getByText('Select all')).toBeInTheDocument();
    expect(result.getByText('Select none')).toBeInTheDocument();

    for (const tag of props.tags) {
      expect(result.getByText(tag)).toBeInTheDocument();
    }

    await waitForComponentToUpdate();
  });

  it('selects and unselects correctly tags with one case', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    for (const tag of props.tags) {
      userEvent.click(result.getByText(tag));
    }

    expect(props.onChangeTags).toBeCalledTimes(props.tags.length);
    expect(props.onChangeTags).nthCalledWith(props.tags.length, {
      selectedTags: ['one', 'two'],
      unSelectedTags: ['coke', 'pepsi'],
    });

    await waitForComponentToUpdate();
  });

  it('selects and unselects correctly tags with multiple cases', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      userEvent.click(result.getByText(tag));
    }

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(propsMultipleCases.tags.length);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(propsMultipleCases.tags.length, {
      selectedTags: ['two', 'three', 'coke', 'pepsi'],
      unSelectedTags: ['one'],
    });

    await waitForComponentToUpdate();
  });

  it('adds a new tag correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    await userEvent.type(result.getByPlaceholderText('Search'), 'not-exist', { delay: 1 });

    await waitFor(() => {
      expect(
        result.getAllByTestId('cases-actions-tags-edit-selectable-add-new-tag')[1]
      ).toBeInTheDocument();
    });

    const addNewTagButton = result.getAllByTestId(
      'cases-actions-tags-edit-selectable-add-new-tag'
    )[1];

    userEvent.click(addNewTagButton);

    await waitForComponentToUpdate();

    expect(result.getByPlaceholderText('Search')).toHaveValue('');
    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedTags: ['coke', 'pepsi', 'not-exist'],
      unSelectedTags: [],
    });
  });
});
