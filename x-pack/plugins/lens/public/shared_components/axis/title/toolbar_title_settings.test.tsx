/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ToolbarTitleSettings, TitleSettingsProps } from './toolbar_title_settings';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderAxisTicksSettings = (propsOverrides?: Partial<TitleSettingsProps>) => {
  const rtlRender = render(
    <ToolbarTitleSettings
      title="My custom X axis title"
      settingId="x"
      isTitleVisible={true}
      updateTitleState={jest.fn()}
      {...propsOverrides}
    />
  );

  return {
    getAxisTitleSelect: () => screen.getByLabelText('Label'),
    getAxisTitleInput: () => screen.getByLabelText('Axis title'),
    ...rtlRender,
  };
};

describe('Axes Title settings', () => {
  it('should show the axes title on the corresponding input text', () => {
    const { getAxisTitleInput } = renderAxisTicksSettings();
    expect(getAxisTitleInput()).toHaveValue('My custom X axis title');
  });

  it('should set the mode to Auto if no title is passed over', () => {
    const { getAxisTitleInput } = renderAxisTicksSettings({ title: undefined });
    expect(getAxisTitleInput()).toHaveValue('');
  });

  it('should set the mode to Auto if empty title is passed over', () => {
    const { getAxisTitleInput } = renderAxisTicksSettings({ title: '' });
    expect(getAxisTitleInput()).toHaveValue('');
  });

  it('should set the mode to None if empty title is passed over and the visibility is set to false', () => {
    const { getAxisTitleSelect } = renderAxisTicksSettings({
      title: '',
      isTitleVisible: false,
    });
    expect(getAxisTitleSelect()).toHaveValue('none');
  });

  it('should disable the input text if the switch is off', () => {
    const { getAxisTitleInput } = renderAxisTicksSettings({
      isTitleVisible: false,
    });
    expect(getAxisTitleInput()).toBeDisabled();
  });

  it('should allow custom mode on user input even with empty string', () => {
    const { getAxisTitleSelect, getAxisTitleInput } = renderAxisTicksSettings({
      title: '',
    });
    userEvent.selectOptions(getAxisTitleSelect(), 'custom');
    expect(getAxisTitleSelect()).toHaveValue('custom');
    expect(getAxisTitleInput()).toHaveValue('');
  });

  it('should reset the label when moving from custom to auto', async () => {
    const updateTitleStateSpy = jest.fn();
    const { getAxisTitleSelect, getAxisTitleInput } = renderAxisTicksSettings({
      isTitleVisible: true,
      title: 'Custom title',
      updateTitleState: updateTitleStateSpy,
    });
    userEvent.selectOptions(getAxisTitleSelect(), 'auto');
    expect(getAxisTitleSelect()).toHaveValue('auto');
    expect(getAxisTitleInput()).toHaveValue('');
    await waitFor(() =>
      expect(updateTitleStateSpy).toHaveBeenCalledWith({ title: undefined, visible: true }, 'x')
    );
  });
});
