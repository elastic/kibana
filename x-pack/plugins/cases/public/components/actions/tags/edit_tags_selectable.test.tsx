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
    expect(result.getByText(`Total tags: ${props.tags.length}`)).toBeInTheDocument();
    expect(result.getByText('Selected: 2')).toBeInTheDocument();
    expect(result.getByText('Select all')).toBeInTheDocument();
    expect(result.getByText('Select none')).toBeInTheDocument();

    for (const tag of props.tags) {
      expect(result.getByText(tag)).toBeInTheDocument();
    }
  });

  it('renders the selected tags label correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    expect(result.getByText('Total tags: 5')).toBeInTheDocument();
    expect(result.getByText('Selected: 4')).toBeInTheDocument();

    for (const tag of props.tags) {
      expect(result.getByText(tag)).toBeInTheDocument();
    }
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
  });

  it('selects and unselects correctly tags with one case', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    for (const tag of props.tags) {
      await userEvent.click(result.getByText(tag));
    }

    expect(props.onChangeTags).toBeCalledTimes(props.tags.length);
    expect(props.onChangeTags).nthCalledWith(props.tags.length, {
      selectedItems: ['one', 'two'],
      unSelectedItems: ['coke', 'pepsi'],
    });
  });

  it('selects and unselects correctly tags with multiple cases', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      await userEvent.click(result.getByText(tag));
    }

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(propsMultipleCases.tags.length);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(propsMultipleCases.tags.length, {
      selectedItems: ['two', 'three', 'coke', 'pepsi'],
      unSelectedItems: ['one'],
    });
  });

  it('renders the icons correctly after selecting and deselecting tags', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      await userEvent.click(result.getByText(tag));
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
      selectedItems: ['two', 'three', 'coke', 'pepsi'],
      unSelectedItems: ['one'],
    });
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

    await userEvent.click(addNewTagButton);

    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedItems: ['not-exist', 'coke', 'pepsi'],
      unSelectedItems: [],
    });
  });

  it('selects all tags correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    expect(result.getByText('Select all')).toBeInTheDocument();
    await userEvent.click(result.getByText('Select all'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: propsMultipleCases.tags,
      unSelectedItems: [],
    });
  });

  it('unselects all tags correctly', async () => {
    const result = appMock.render(<EditTagsSelectable {...propsMultipleCases} />);

    expect(result.getByText('Select all')).toBeInTheDocument();
    await userEvent.click(result.getByText('Select none'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: [],
      unSelectedItems: ['one', 'three', 'coke', 'pepsi'],
    });
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

    await userEvent.click(result.getByTestId(iconDataTestSubj));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: [],
      unSelectedItems: ['one'],
    });
  });

  it('adds a partial match correctly and does not show the no match label', async () => {
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

    expect(
      result.queryByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).not.toBeInTheDocument();

    const addNewTagButton = result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag');

    await userEvent.click(addNewTagButton);

    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedItems: ['on', 'coke', 'pepsi'],
      unSelectedItems: [],
    });
  });

  it('do not show the new item option on exact match', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    await userEvent.type(result.getByPlaceholderText('Search'), 'one', { delay: 1 });

    expect(
      result.queryByTestId('cases-actions-tags-edit-selectable-add-new-tag')
    ).not.toBeInTheDocument();
  });

  it('does not show the no match label when the initial tags are empty', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} tags={[]} />);

    expect(
      result.queryByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).not.toBeInTheDocument();
  });

  it('shows the no match label when there is no match', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    await userEvent.type(result.getByPlaceholderText('Search'), 'not-exist', { delay: 1 });

    expect(
      result.getByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).toBeInTheDocument();
  });

  it('shows the no match label and the add new item when there is space in the search term', async () => {
    const result = appMock.render(<EditTagsSelectable {...props} />);

    await userEvent.type(result.getByPlaceholderText('Search'), 'test tag', { delay: 1 });

    await waitFor(() => {
      expect(
        result.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    expect(
      result.getByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).toBeInTheDocument();
  });
});
