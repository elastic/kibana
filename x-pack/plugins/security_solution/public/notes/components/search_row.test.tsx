/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SearchRow } from './search_row';
import { ASSOCIATED_NOT_SELECT_TEST_ID, SEARCH_BAR_TEST_ID, USER_SELECT_TEST_ID } from './test_ids';
import { AssociatedFilter } from '../../../common/notes/constants';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';

jest.mock('../../common/components/user_profiles/use_suggest_users');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('SearchRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [{ user: { username: 'test' } }, { user: { username: 'elastic' } }],
    });
  });

  it('should render the component', () => {
    const { getByTestId } = render(<SearchRow />);

    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(USER_SELECT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSOCIATED_NOT_SELECT_TEST_ID)).toBeInTheDocument();
  });

  it('should call the correct action when entering a value in the search bar', async () => {
    const { getByTestId } = render(<SearchRow />);

    const searchBox = getByTestId(SEARCH_BAR_TEST_ID);

    await userEvent.type(searchBox, 'test');
    await userEvent.keyboard('{enter}');

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should call the correct action when select a user', async () => {
    const { getByTestId } = render(<SearchRow />);

    const userSelect = getByTestId('comboBoxSearchInput');
    userSelect.focus();

    const option = await screen.findByText('test');
    fireEvent.click(option);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should call the correct action when select a value in the associated note dropdown', async () => {
    const { getByTestId } = render(<SearchRow />);

    const associatedNoteSelect = getByTestId(ASSOCIATED_NOT_SELECT_TEST_ID);
    await userEvent.selectOptions(associatedNoteSelect, [AssociatedFilter.documentOnly]);

    expect(mockDispatch).toHaveBeenCalled();
  });
});
