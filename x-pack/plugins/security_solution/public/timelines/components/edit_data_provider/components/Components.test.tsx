/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataProviderType } from '../../timeline/data_providers/data_provider';
import { ControlledComboboxInput, ControlledDefaultInput } from '.';
import { getDefaultValue } from './ControlledDefaultInput';
import {
  convertComboboxValuesToStringArray,
  convertValuesToComboboxValueArray,
} from './ControlledComboboxInput';

const disabledButtonCallbackMock = jest.fn();
const onChangeCallbackMock = jest.fn();

const renderControlledComboboxInput = (badOverrideValue?: string) =>
  render(
    <ControlledComboboxInput
      type={DataProviderType.default}
      value={badOverrideValue || ['test']}
      onChangeCallback={onChangeCallbackMock}
      disableButtonCallback={disabledButtonCallbackMock}
    />
  );

const renderControlledDefaultInput = (badOverrideValue?: string[]) =>
  render(
    <ControlledDefaultInput
      type={DataProviderType.default}
      value={badOverrideValue || 'test'}
      onChangeCallback={onChangeCallbackMock}
      disableButtonCallback={disabledButtonCallbackMock}
    />
  );

describe('ControlledComboboxInput', () => {
  afterEach(jest.clearAllMocks);

  it('renders the current value', () => {
    renderControlledComboboxInput();
    expect(screen.getByText('test'));
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(false);
  });

  it('calls onChangeCallback, and disabledButtonCallback when value is removed', () => {
    renderControlledComboboxInput();
    const removeButton = screen.getAllByRole('button')[0];

    userEvent.click(removeButton);
    expect(onChangeCallbackMock).toHaveBeenLastCalledWith([]);
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(true);
  });

  it('handles non arrays by defaulting to an empty state', () => {
    renderControlledComboboxInput('nonArray');

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith([]);
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(true);
  });
});

describe('ControlledDefaultInput', () => {
  afterEach(jest.clearAllMocks);

  it('renders the current value', () => {
    renderControlledDefaultInput();
    expect(screen.getByDisplayValue('test'));
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(false);
  });

  it('calls onChangeCallback, and disabledButtonCallback when value is changed', () => {
    renderControlledDefaultInput([]);
    const inputBox = screen.getByPlaceholderText('value');

    userEvent.type(inputBox, 'new value');

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith('new value');
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(false);
  });

  it('handles arrays by defaulting to the first value', () => {
    renderControlledDefaultInput(['testing']);

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith('testing');
    expect(disabledButtonCallbackMock).toHaveBeenLastCalledWith(false);
  });

  describe('getDefaultValue', () => {
    it('Returns a provided value if the value is a string or number', () => {
      expect(getDefaultValue('test')).toBe('test');
      expect(getDefaultValue(0)).toBe(0);
    });

    it('Returns the first value of a string | number array if it exists', () => {
      expect(getDefaultValue(['a', 'b'])).toBe('a');
      expect(getDefaultValue([0, 1])).toBe(0);
      expect(getDefaultValue([])).toBe('');
    });
  });

  describe('convertValuesToComboboxValueArray', () => {
    it('returns an empty array if not provided correct input', () => {
      expect(convertValuesToComboboxValueArray('test')).toEqual([]);
      expect(convertValuesToComboboxValueArray(1)).toEqual([]);
    });

    it('Returns a comboboxoption array when provided the correct input', () => {
      expect(convertValuesToComboboxValueArray(['a', 'b'])).toEqual([
        { label: 'a' },
        { label: 'b' },
      ]);
      expect(convertValuesToComboboxValueArray([1, 2])).toEqual([{ label: '1' }, { label: '2' }]);
    });
  });

  describe('convertComboboxValuesToStringArray', () => {
    it('correctly converts combobox values to a string array ', () => {
      expect(convertComboboxValuesToStringArray([])).toEqual([]);
      expect(convertComboboxValuesToStringArray([{ label: '1' }, { label: '2' }])).toEqual([
        '1',
        '2',
      ]);
    });
  });
});
