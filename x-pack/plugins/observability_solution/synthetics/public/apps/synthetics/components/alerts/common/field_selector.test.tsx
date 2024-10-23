/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { onFieldChange } from './field_selector';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { ALL_VALUE } from '@kbn/slo-schema';

describe('onFieldChange', () => {
  let onChangeMock: jest.Mock;

  beforeEach(() => {
    onChangeMock = jest.fn();
  });

  it('should filter out ALL_VALUE when a specific value is selected', () => {
    const selected: Array<EuiComboBoxOptionOption<string>> = [
      { label: 'Option 2', value: ALL_VALUE },
      { label: 'Option 1', value: 'value1' },
    ];

    onFieldChange(selected, onChangeMock);

    expect(onChangeMock).toHaveBeenCalledWith(['value1']);
  });

  it('should return an empty array when ALL_VALUE is selected', () => {
    const selected: Array<EuiComboBoxOptionOption<string>> = [
      { label: 'Option 1', value: 'value1' },
      { label: 'Option 2', value: ALL_VALUE },
    ];

    onFieldChange(selected, onChangeMock);

    expect(onChangeMock).toHaveBeenCalledWith([]);
  });

  it('should return an empty array when selected is empty', () => {
    const selected: Array<EuiComboBoxOptionOption<string>> = [];

    onFieldChange(selected, onChangeMock);

    expect(onChangeMock).toHaveBeenCalledWith([]);
  });

  it('should call onChange with the filtered array when no ALL_VALUE is present', () => {
    const selected: Array<EuiComboBoxOptionOption<string>> = [
      { label: 'Option 1', value: 'value1' },
      { label: 'Option 2', value: 'value2' },
    ];

    onFieldChange(selected, onChangeMock);

    expect(onChangeMock).toHaveBeenCalledWith(['value1', 'value2']);
  });

  it('should return an empty array if the last selected option is ALL_VALUE', () => {
    const selected: Array<EuiComboBoxOptionOption<string>> = [
      { label: 'Option 1', value: 'value1' },
      { label: 'Option 2', value: ALL_VALUE },
    ];

    onFieldChange(selected, onChangeMock);

    expect(onChangeMock).toHaveBeenCalledWith([]);
  });
});
