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
import { EditAssigneesFlyout } from './edit_assignees_flyout';
import { waitFor } from '@testing-library/react';

jest.mock('../../../containers/user_profiles/api');

describe('EditAssigneesFlyout', () => {
  let appMock: AppMockRenderer;

  /**
   * Case one has the following assignees: coke, pepsi, one
   * Case two has the following assignees: one, three
   * All available assignees are: one, two, three, coke, pepsi
   */
  const props = {
    selectedCases: [basicCase],
    onClose: jest.fn(),
    onSaveAssignees: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<EditAssigneesFlyout {...props} />);

    expect(result.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-assignees-flyout-title')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-assignees-flyout-cancel')).toBeInTheDocument();
    expect(result.getByTestId('cases-edit-assignees-flyout-submit')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('calls onClose when pressing the cancel button', async () => {
    const result = appMock.render(<EditAssigneesFlyout {...props} />);

    userEvent.click(result.getByTestId('cases-edit-assignees-flyout-cancel'));
    expect(props.onClose).toHaveBeenCalled();

    await waitForComponentToUpdate();
  });

  it('calls onSaveAssignees when pressing the save selection button', async () => {
    const result = appMock.render(<EditAssigneesFlyout {...props} />);

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(result.getByText('Damaged Raccoon')).toBeInTheDocument();
    });

    userEvent.click(result.getByText('Damaged Raccoon'));
    userEvent.click(result.getByTestId('cases-edit-assignees-flyout-submit'));

    expect(props.onSaveAssignees).toHaveBeenCalledWith({
      selectedItems: [],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('shows the case title when selecting one case', async () => {
    const result = appMock.render(<EditAssigneesFlyout {...props} />);

    expect(result.getByText(basicCase.title)).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('shows the number of total selected cases in the title  when selecting multiple cases', async () => {
    const result = appMock.render(
      <EditAssigneesFlyout {...props} selectedCases={[basicCase, basicCase]} />
    );

    expect(result.getByText('Selected cases: 2')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });
});
