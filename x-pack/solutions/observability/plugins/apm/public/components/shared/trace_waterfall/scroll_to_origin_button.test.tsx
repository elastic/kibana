/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScrollToOriginButton } from './scroll_to_origin_button';

const renderButton = (props: React.ComponentProps<typeof ScrollToOriginButton>) =>
  render(
    <EuiThemeProvider>
      <ScrollToOriginButton {...props} />
    </EuiThemeProvider>
  );

describe('ScrollToOriginButton', () => {
  it('renders the button', () => {
    renderButton({ isDisabled: false, onClick: () => {} });

    expect(screen.getByTestId('waterfallScrollToOriginButton')).toBeInTheDocument();
  });

  it('renders the label', () => {
    renderButton({ isDisabled: false, onClick: () => {} });

    expect(screen.getByText('Scroll to origin')).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    const onClick = jest.fn();
    renderButton({ isDisabled: false, onClick });

    fireEvent.click(screen.getByTestId('waterfallScrollToOriginButton'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when isDisabled is true', () => {
    renderButton({ isDisabled: true, onClick: () => {} });

    expect(screen.getByTestId('waterfallScrollToOriginButton')).toBeDisabled();
  });
});
