/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MetadataKICard } from './metadata_ki_card';

describe('MetadataKICard', () => {
  it('renders subtype and name', () => {
    render(<MetadataKICard subtype="Service" name="payment" />);

    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('payment')).toBeInTheDocument();
  });

  it('renders as a non-interactive div when no onClick is provided', () => {
    render(<MetadataKICard subtype="Service" name="payment" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a button with aria-pressed reflecting `selected` when onClick is provided', () => {
    const { rerender } = render(
      <MetadataKICard subtype="Service" name="payment" onClick={() => {}} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    rerender(<MetadataKICard subtype="Service" name="payment" selected onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('invokes onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MetadataKICard subtype="Service" name="payment" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
