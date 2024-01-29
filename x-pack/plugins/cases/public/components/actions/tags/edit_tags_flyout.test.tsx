/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { basicCase, tags } from '../../../containers/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { EditTagsFlyout } from './edit_tags_flyout';

jest.mock('../../../containers/use_get_tags');

const useGetTagsMock = useGetTags as jest.Mock;

describe('EditTagsFlyout', () => {
  let appMock: AppMockRenderer;

  /**
   * Case one has the following tags: coke, pepsi, one
   * Case two has the following tags: one, three
   * All available tags are: one, two, three, coke, pepsi
   */
  const props = {
    selectedCases: [basicCase],
    onClose: jest.fn(),
    onSaveTags: jest.fn(),
  };

  useGetTagsMock.mockReturnValue({ isLoading: false, data: tags });

  beforeEach(() => {
    jest.clearAllMocks();
    appMock = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMock.render(<EditTagsFlyout {...props} />);

    expect(await screen.findByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-tags-flyout-title')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-tags-flyout-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-tags-flyout-submit')).toBeInTheDocument();
  });

  it('calls onClose when pressing the cancel button', async () => {
    appMock.render(<EditTagsFlyout {...props} />);

    userEvent.click(await screen.findByTestId('cases-edit-tags-flyout-cancel'));

    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('calls onSaveTags when pressing the save selection button', async () => {
    appMock.render(<EditTagsFlyout {...props} />);

    expect(await screen.findByText('coke')).toBeInTheDocument();

    userEvent.click(await screen.findByText('coke'));
    userEvent.click(await screen.findByTestId('cases-edit-tags-flyout-submit'));

    await waitFor(() => {
      expect(props.onSaveTags).toHaveBeenCalledWith({
        selectedItems: ['pepsi'],
        unSelectedItems: ['coke'],
      });
    });
  });

  it('shows the case title when selecting one case', async () => {
    appMock.render(<EditTagsFlyout {...props} />);

    expect(await screen.findByText(basicCase.title)).toBeInTheDocument();
  });

  it('shows the number of total selected cases in the title  when selecting multiple cases', async () => {
    appMock.render(<EditTagsFlyout {...props} selectedCases={[basicCase, basicCase]} />);

    expect(await screen.findByText('Selected cases: 2')).toBeInTheDocument();
  });
});
