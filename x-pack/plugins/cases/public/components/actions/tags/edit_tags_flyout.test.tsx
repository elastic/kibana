/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { waitForComponentToUpdate } from '../../../common/test_utils';
import { EditTagsFlyout } from './edit_tags_flyout';
import { waitFor } from '@testing-library/react';

jest.mock('../../../containers/api');

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

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<EditTagsFlyout {...props} />);

    expect(result.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-tags-flyout-title')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-tags-flyout-cancel')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-tags-flyout-submit')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('calls onClose when pressing the cancel button', async () => {
    const result = appMock.render(<EditTagsFlyout {...props} />);

    userEvent.click(result.getByTestId('cases-edit-tags-flyout-cancel'));
    expect(props.onClose).toHaveBeenCalled();

    await waitForComponentToUpdate();
  });

  it('calls onSaveTags when pressing the save selection button', async () => {
    const result = appMock.render(<EditTagsFlyout {...props} />);

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(result.getByText('coke')).toBeInTheDocument();
    });

    userEvent.click(result.getByText('coke'));
    userEvent.click(result.getByTestId('cases-edit-tags-flyout-submit'));

    expect(props.onSaveTags).toHaveBeenCalledWith({
      selectedItems: ['pepsi'],
      unSelectedItems: ['coke'],
    });
  });

  it('shows the case title when selecting one case', async () => {
    const result = appMock.render(<EditTagsFlyout {...props} />);

    expect(result.getByText(basicCase.title)).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('shows the number of total selected cases in the title  when selecting multiple cases', async () => {
    const result = appMock.render(
      <EditTagsFlyout {...props} selectedCases={[basicCase, basicCase]} />
    );

    expect(result.getByText('Selected cases: 2')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });
});
