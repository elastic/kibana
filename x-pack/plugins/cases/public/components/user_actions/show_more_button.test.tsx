/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowMoreButton } from './show_more_button';

const showMoreClickMock = jest.fn();

describe('ShowMoreButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ShowMoreButton onShowMoreClick={showMoreClickMock} />);

    expect(screen.getByTestId('cases-show-more-user-actions')).toBeInTheDocument();
  });

  it('shows loading state and is disabled when isLoading is true', () => {
    render(<ShowMoreButton onShowMoreClick={showMoreClickMock} isLoading={true} />);

    const btn = screen.getByTestId('cases-show-more-user-actions');

    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('disabled');
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('calls onShowMoreClick on button click', async () => {
    render(<ShowMoreButton onShowMoreClick={showMoreClickMock} />);

    await userEvent.click(screen.getByTestId('cases-show-more-user-actions'));
    expect(showMoreClickMock).toHaveBeenCalled();
  });
});
