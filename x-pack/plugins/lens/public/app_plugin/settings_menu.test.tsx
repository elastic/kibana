/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithReduxStore } from '../mocks';
import { SettingsMenu } from './settings_menu';
import { screen, waitFor, act } from '@testing-library/react';

describe('settings menu', () => {
  const onCloseMock = jest.fn();

  const renderSettingsMenu = (propsOverrides = {}) => {
    const rtlRender = renderWithReduxStore(
      <SettingsMenu
        anchorElement={document.createElement('button')}
        isOpen
        onClose={onCloseMock}
        {...propsOverrides}
      />
    );

    const toggleAutoApply = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      act(() => {
        autoApplyToggle.click();
      });
    };

    const isAutoApplyOn = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      return autoApplyToggle.getAttribute('aria-checked') === 'true';
    };

    return {
      toggleAutoApply,
      isAutoApplyOn,
      ...rtlRender,
    };
  };

  afterEach(() => {
    onCloseMock.mockClear();
  });

  it('should call onClose when popover closes after toggling', async () => {
    const { toggleAutoApply } = renderSettingsMenu();
    toggleAutoApply();

    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it('should toggle auto-apply', async () => {
    const { toggleAutoApply, isAutoApplyOn } = renderSettingsMenu();

    expect(isAutoApplyOn()).toBeTruthy();

    toggleAutoApply();
    expect(isAutoApplyOn()).toBeFalsy();

    toggleAutoApply();
    expect(isAutoApplyOn()).toBeTruthy();
  });
});
