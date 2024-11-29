/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CreatedByFilterDropdown } from './created_by_filter_dropdown';
import { CREATED_BY_SELECT_TEST_ID } from './test_ids';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';
import { useLicense } from '../../common/hooks/use_license';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';

jest.mock('../../common/components/user_profiles/use_suggest_users');
jest.mock('../../common/hooks/use_license');
jest.mock('../../common/hooks/use_upselling');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('UserFilterDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [
        {
          uid: '1',
          user: { username: 'test' },
        },
        {
          uid: '2',
          user: { username: 'elastic' },
        },
      ],
    });
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
    (useUpsellingMessage as jest.Mock).mockReturnValue('upsellingMessage');
  });

  it('should render the component enabled', () => {
    const { getByTestId } = render(<CreatedByFilterDropdown />);

    const dropdown = getByTestId(CREATED_BY_SELECT_TEST_ID);

    expect(dropdown).toBeInTheDocument();
    expect(dropdown).not.toHaveClass('euiComboBox-isDisabled');
  });

  it('should render the dropdown disabled', async () => {
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => false });

    const { getByTestId } = render(<CreatedByFilterDropdown />);

    expect(getByTestId(CREATED_BY_SELECT_TEST_ID)).toHaveClass('euiComboBox-isDisabled');
  });

  it('should call the correct action when select a user', async () => {
    const { getByTestId } = render(<CreatedByFilterDropdown />);

    const userSelect = getByTestId('comboBoxSearchInput');
    userSelect.focus();

    const option = await screen.findByText('test');
    fireEvent.click(option);

    expect(mockDispatch).toHaveBeenCalled();
  });
});
