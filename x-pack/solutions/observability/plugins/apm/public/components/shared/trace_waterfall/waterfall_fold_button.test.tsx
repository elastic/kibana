/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import type { WaterfallFoldButtonProps } from './waterfall_fold_button';
import { WaterfallFoldButton } from './waterfall_fold_button';

describe('WaterfallFoldButton', () => {
  const renderButton = (props: WaterfallFoldButtonProps) => {
    return render(<WaterfallFoldButton {...props} />);
  };

  it('renders with fold icon when isOpen is true', () => {
    renderButton({ isOpen: true, onClick: jest.fn() });

    const button = screen.getByTestId('traceWaterfallFoldButton');

    expect(button.querySelector('[data-euiicon-type="fold"]')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Click to fold the waterfall');
  });
  it('renders with unfold icon when isOpen is false', () => {
    renderButton({ isOpen: false, onClick: jest.fn() });

    const button = screen.getByTestId('traceWaterfallFoldButton');

    expect(button.querySelector('[data-euiicon-type="unfold"]')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Click to unfold the waterfall');
  });
  it('calls onClick when clicked', () => {
    const onClick = jest.fn();

    renderButton({ isOpen: true, onClick });

    const button = screen.getByTestId('traceWaterfallFoldButton');

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalled();
  });
});
