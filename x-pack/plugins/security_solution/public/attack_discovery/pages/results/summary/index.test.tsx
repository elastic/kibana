/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Summary } from '.';

describe('Summary', () => {
  const defaultProps = {
    alertsCount: 20,
    attackDiscoveriesCount: 5,
    lastUpdated: new Date(),
    onToggleShowAnonymized: jest.fn(),
    showAnonymized: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the expected summary counts', () => {
    render(<Summary {...defaultProps} />);

    const summaryCount = screen.getByTestId('summaryCount');

    expect(summaryCount).toHaveTextContent('5 discoveries|20 alerts|Generated: a few seconds ago');
  });

  it('renders the expected button icon when showAnonymized is false', () => {
    render(<Summary {...defaultProps} />);

    const toggleAnonymized = screen.getByTestId('toggleAnonymized').querySelector('span');

    expect(toggleAnonymized).toHaveAttribute('data-euiicon-type', 'eyeClosed');
  });

  it('renders the expected button icon when showAnonymized is true', () => {
    render(<Summary {...defaultProps} showAnonymized={true} />);

    const toggleAnonymized = screen.getByTestId('toggleAnonymized').querySelector('span');

    expect(toggleAnonymized).toHaveAttribute('data-euiicon-type', 'eye');
  });

  it('calls onToggleShowAnonymized when toggle button is clicked', () => {
    render(<Summary {...defaultProps} />);

    const toggleAnonymized = screen.getByTestId('toggleAnonymized');
    fireEvent.click(toggleAnonymized);

    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
  });
});
