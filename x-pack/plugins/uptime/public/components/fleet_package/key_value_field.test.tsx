/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { KeyValuePairsField, Pair } from './key_value_field';

describe('<KeyValuePairsField />', () => {
  const onChange = jest.fn();
  const defaultDefaultValue = [['', '', false]] as Pair[];
  const WrappedComponent = ({ defaultValue = defaultDefaultValue }) => {
    return <KeyValuePairsField defaultPairs={defaultValue} onChange={onChange} />;
  };

  it('renders KeyValuePairsField', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    expect(getByText('Key')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();

    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect((getByTestId('keyValuePairsKey0') as HTMLInputElement).value).toEqual('');
    expect((getByTestId('keyValuePairsKey0') as HTMLInputElement).value).toEqual('');
  });

  it('checks current row checkbox and adds new row when the existing row is edited', async () => {
    const { getByTestId, queryByTestId } = render(<WrappedComponent />);

    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const value = getByTestId('keyValuePairsValue0') as HTMLInputElement;
    const newKey = 'sampleKey';
    const newValue = 'sampleValue';
    expect(queryByTestId('keyValuePairsKey1')).not.toBeInTheDocument(); // check that only one row exists

    fireEvent.change(key, { target: { value: newKey } });
    fireEvent.change(value, { target: { value: newValue } });

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
      expect(checkbox.disabled).toBe(false);
      expect(key.value).toBe(newKey);
      expect(onChange).toBeCalledWith([
        [newKey, newValue, true],
        ['', '', false],
      ]);

      const newRowCheckbox = getByTestId('keyValuePairsCheckbox1') as HTMLInputElement;
      const newRowKey = getByTestId('keyValuePairsKey1') as HTMLInputElement;
      const newRowValue = getByTestId('keyValuePairsValue1') as HTMLInputElement;
      expect(newRowCheckbox).toBeInTheDocument();
      expect(newRowCheckbox.checked).toBe(false);
      expect(newRowKey.value).toEqual('');
      expect(newRowValue.value).toEqual('');
    });
  });

  it('unchecks and disables checkbox when key is empty', async () => {
    const { getByTestId } = render(<WrappedComponent />);

    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const newKey = 'sampleKey';

    fireEvent.change(key, { target: { value: newKey } });

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
      expect(checkbox.disabled).toBe(false);
      expect(key.value).toBe(newKey);
      expect(onChange).toBeCalledWith([
        [newKey, '', true],
        ['', '', false],
      ]);
    });

    const emptyKey = '';
    fireEvent.change(key, { target: { value: emptyKey } });

    await waitFor(() => {
      expect(checkbox.checked).toBe(false);
      expect(checkbox.disabled).toBe(true);
      expect(key.value).toBe(emptyKey);
      expect(onChange).toBeCalledWith([
        ['', '', false],
        ['', '', false],
      ]);
    });
  });

  it('handles manually checking checkbox', async () => {
    const { getByTestId } = render(
      <WrappedComponent defaultValue={[['sampleKey', 'sampleValue', true]]} />
    );

    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox.checked).toBe(false);
      expect(checkbox.disabled).toBe(false);
      expect(onChange).toBeCalledWith([['sampleKey', 'sampleValue', false]]);
    });
  });

  it('only adds one extra row when interacting with the current row multiple times', async () => {
    const { getByTestId, queryByTestId } = render(<WrappedComponent />);

    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    expect(queryByTestId('keyValuePairsKey1')).not.toBeInTheDocument(); // check that only one row exists

    fireEvent.change(key, { target: { value: 'sampleKey' } });

    await waitFor(() => {
      const newRowCheckbox = getByTestId('keyValuePairsCheckbox1') as HTMLInputElement;
      const newRowKey = getByTestId('keyValuePairsKey1') as HTMLInputElement;
      const newRowValue = getByTestId('keyValuePairsValue1') as HTMLInputElement;
      expect(newRowCheckbox).toBeInTheDocument();
      expect(newRowCheckbox.checked).toBe(false);
      expect(newRowKey.value).toEqual('');
      expect(newRowValue.value).toEqual('');
    });

    fireEvent.change(key, { target: { value: 'sampleKey2' } });

    await waitFor(() => {
      const extraRowCheckbox = queryByTestId('keyValuePairsCheckbox2') as HTMLInputElement;
      const extraRowKey = queryByTestId('keyValuePairsKey2') as HTMLInputElement;
      const extraRowValue = queryByTestId('keyValuePairsValue2') as HTMLInputElement;
      expect(extraRowCheckbox).not.toBeInTheDocument();
      expect(extraRowKey).not.toBeInTheDocument();
      expect(extraRowValue).not.toBeInTheDocument();
    });
  });
});
