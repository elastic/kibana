/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ProductSwitch } from './product_switch';
import { EuiThemeComputed } from '@elastic/eui';
import { ProductId } from './types';

describe('ProductSwitch', () => {
  const onProductSwitchChangedMock = jest.fn();
  const mockEuiTheme = { base: 16, size: { xs: '4px' } } as EuiThemeComputed;
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render product switches with correct labels', () => {
    const { getByText } = render(
      <ProductSwitch
        onProductSwitchChanged={onProductSwitchChangedMock}
        activeSections={new Set()}
        euiTheme={mockEuiTheme}
      />
    );

    const analyticsSwitch = getByText('Analytics');
    const cloudSwitch = getByText('Cloud');
    const endpointSwitch = getByText('Endpoint');

    expect(analyticsSwitch).toBeInTheDocument();
    expect(cloudSwitch).toBeInTheDocument();
    expect(endpointSwitch).toBeInTheDocument();
  });

  it('should call onProductSwitchChanged when a switch is toggled', () => {
    const { getByText } = render(
      <ProductSwitch
        onProductSwitchChanged={onProductSwitchChangedMock}
        activeSections={new Set()}
        euiTheme={mockEuiTheme}
      />
    );

    const analyticsSwitch = getByText('Analytics');
    fireEvent.click(analyticsSwitch);

    expect(onProductSwitchChangedMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'analytics' })
    );
  });

  it('should have checked switches for activeSections', () => {
    const activeSections = new Set([ProductId.analytics, ProductId.endpoint]);
    const { getByTestId } = render(
      <ProductSwitch
        onProductSwitchChanged={onProductSwitchChangedMock}
        activeSections={activeSections}
        euiTheme={mockEuiTheme}
      />
    );

    const analyticsSwitch = getByTestId('analytics');
    const cloudSwitch = getByTestId('cloud');
    const endpointSwitch = getByTestId('endpoint');

    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');
    expect(cloudSwitch).toHaveAttribute('aria-checked', 'false');
    expect(endpointSwitch).toHaveAttribute('aria-checked', 'true');
  });
});
