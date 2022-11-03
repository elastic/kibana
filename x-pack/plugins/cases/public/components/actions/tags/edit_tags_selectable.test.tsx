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

  /**
   * Case has the following tags: coke, pepsi
   * All available tags are: one, two, coke, pepsi
   */
  const props = {
    selectedCases: [basicCase],
    isLoading: false,
    tags: ['one', 'two', ...basicCase.tags],
    onChangeTags: jest.fn(),
  };

  /**
   * Case one has the following tags: coke, pepsi, one
   * Case two has the following tags: one, three
   * All available tags are: one, two, three, coke, pepsi
   */
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

  it('renders the tags icons correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    for (const [tag, icon] of [
      ['one', 'check'],
      ['two', 'empty'],
      ['three', 'asterisk'],
      ['coke', 'asterisk'],
      ['pepsi', 'asterisk'],
    ]) {
      const iconDataTestSubj = `cases-actions-tags-edit-selectable-tag-${tag}-icon-${icon}`;
      expect(result.getByTestId(iconDataTestSubj)).toBeInTheDocument();
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

  it('renders the icons correctly after selecting and deselecting tags', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      userEvent.click(result.getByText(tag));
    }

    for (const [tag, icon] of [
      ['one', 'empty'],
      ['two', 'check'],
      ['three', 'check'],
      ['coke', 'check'],
      ['pepsi', 'check'],
    ]) {
      const iconDataTestSubj = `cases-actions-tags-edit-selectable-tag-${tag}-icon-${icon}`;
      expect(result.getByTestId(iconDataTestSubj)).toBeInTheDocument();
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
        result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    const addNewTagButton = result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag');

    userEvent.click(addNewTagButton);

    await waitForComponentToUpdate();

    // expect(result.getByPlaceholderText('Search')).toHaveValue('');
    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedTags: ['not-exist', 'coke', 'pepsi'],
      unSelectedTags: [],
    });
  });

  it('selects all tags correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    expect(result.getByText('Select all')).toBeInTheDocument();
    userEvent.click(result.getByText('Select all'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedTags: propsMultipleCases.tags,
      unSelectedTags: [],
    });

    await waitForComponentToUpdate();
  });

  it('unselects all tags correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    expect(result.getByText('Select all')).toBeInTheDocument();
    userEvent.click(result.getByText('Select none'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedTags: [],
      unSelectedTags: ['one', 'three', 'coke', 'pepsi'],
    });

    await waitForComponentToUpdate();
  });

  it('unselects correctly with the new item presented', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    /**
     * Tag with label "one" exist. Searching for "on" will show both the
     * "add new tag" item and the "one" tag
     */
    await userEvent.type(result.getByPlaceholderText('Search'), 'on', { delay: 1 });

    await waitFor(() => {
      expect(
        result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    const iconDataTestSubj = 'cases-actions-tags-edit-selectable-tag-one-icon-check';
    expect(result.getByTestId(iconDataTestSubj)).toBeInTheDocument();

    userEvent.click(result.getByTestId(iconDataTestSubj));

    await waitForComponentToUpdate();

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedTags: [],
      unSelectedTags: ['one'],
    });
  });

  it('adds a partial match correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    /**
     * Tag with label "one" exist. Searching for "on" will show both the
     * "add new tag" item and the "one" tag
     */
    await userEvent.type(result.getByPlaceholderText('Search'), 'on', { delay: 1 });

    await waitFor(() => {
      expect(
        result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    const addNewTagButton = result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag');

    userEvent.click(addNewTagButton);

    await waitForComponentToUpdate();

    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedTags: ['on', 'coke', 'pepsi'],
      unSelectedTags: [],
    });
  });

  it('do not show the new item option on exact match', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    await userEvent.type(result.getByPlaceholderText('Search'), 'one', { delay: 1 });
    await waitForComponentToUpdate();

    expect(
      result.queryByTestId('cases-actions-tags-edit-selectable-add-new-tag')
    ).not.toBeInTheDocument();
  });
});
