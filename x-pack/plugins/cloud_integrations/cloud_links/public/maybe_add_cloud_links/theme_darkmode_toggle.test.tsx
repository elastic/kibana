/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { ThemDarkModeToggle } from './theme_darkmode_toggle';

describe('ThemDarkModeToggle', () => {
  const mockUseUpdateUserProfile = jest.fn();
  const mockGetSpaceDarkModeValue = jest.fn();

  it('renders correctly and toggles dark mode', () => {
    const security = {
      ...securityMock.createStart(),
      hooks: { useUpdateUserProfile: mockUseUpdateUserProfile },
    };
    const core = coreMock.createStart();

    const mockUpdate = jest.fn();
    mockUseUpdateUserProfile.mockReturnValue({
      userProfileData: { userSettings: { darkMode: 'light' } },
      isLoading: false,
      update: mockUpdate,
    });

    mockGetSpaceDarkModeValue.mockReturnValue(false);

    const { getByTestId, rerender } = render(
      <ThemDarkModeToggle core={core} security={security} />
    );

    const toggleSwitch = getByTestId('darkModeToggleSwitch');
    fireEvent.click(toggleSwitch);
    expect(mockUpdate).toHaveBeenCalledWith({ userSettings: { darkMode: 'dark' } });

    // Now we want to simulate toggling back to light
    mockUseUpdateUserProfile.mockReturnValue({
      userProfileData: { userSettings: { darkMode: 'dark' } },
      isLoading: false,
      update: mockUpdate,
    });

    // Rerender the component to apply the new props
    rerender(<ThemDarkModeToggle core={core} security={security} />);

    fireEvent.click(toggleSwitch);
    expect(mockUpdate).toHaveBeenLastCalledWith({ userSettings: { darkMode: 'light' } });
  });
});
