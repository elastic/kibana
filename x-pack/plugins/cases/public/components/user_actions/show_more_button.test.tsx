/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowMoreButton } from './show_more_button';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

const showMoreClickMock = jest.fn();

describe('ShowMoreButton', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<ShowMoreButton onShowMoreClick={showMoreClickMock} />);

    expect(screen.getByTestId('cases-show-more-user-actions')).toBeInTheDocument();
  });

  it('shows loading state and is disabled when isLoading is true', () => {
    appMockRender.render(<ShowMoreButton onShowMoreClick={showMoreClickMock} isLoading={true} />);

    const btn = screen.getByTestId('cases-show-more-user-actions');

    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('disabled');
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('calls onShowMoreClick on button click', () => {
    appMockRender.render(<ShowMoreButton onShowMoreClick={showMoreClickMock} />);

    userEvent.click(screen.getByTestId('cases-show-more-user-actions'));
    expect(showMoreClickMock).toHaveBeenCalled();
  });
});
