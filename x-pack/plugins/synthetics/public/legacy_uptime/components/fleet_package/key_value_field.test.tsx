/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { KeyValuePairsField, Pair } from './key_value_field';

describe('<KeyValuePairsField />', () => {
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const defaultDefaultValue = [['', '']] as Pair[];
  const WrappedComponent = ({
    defaultValue = defaultDefaultValue,
    addPairControlLabel = 'Add pair',
  }) => {
    return (
      <KeyValuePairsField
        defaultPairs={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        addPairControlLabel={addPairControlLabel}
      />
    );
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders KeyValuePairsField', () => {
    const { getByText } = render(<WrappedComponent />);
    expect(getByText('Key')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();

    expect(getByText('Add pair')).toBeInTheDocument();
  });

  it('calls onBlur', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const addPair = getByText('Add pair');
    fireEvent.click(addPair);

    const keyInput = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const valueInput = getByTestId('keyValuePairsValue0') as HTMLInputElement;

    userEvent.type(keyInput, 'some-key');
    userEvent.type(valueInput, 'some-value');
    fireEvent.blur(valueInput);

    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('handles adding and editing a new row', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <WrappedComponent defaultValue={[]} />
    );

    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(queryByTestId('keyValuePairsValue0')).not.toBeInTheDocument(); // check that only one row exists

    const addPair = getByText('Add pair');

    fireEvent.click(addPair);

    const newRowKey = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const newRowValue = getByTestId('keyValuePairsValue0') as HTMLInputElement;

    await waitFor(() => {
      expect(newRowKey.value).toEqual('');
      expect(newRowValue.value).toEqual('');
      expect(onChange).toBeCalledWith([[newRowKey.value, newRowValue.value]]);
    });

    fireEvent.change(newRowKey, { target: { value: 'newKey' } });
    fireEvent.change(newRowValue, { target: { value: 'newValue' } });

    await waitFor(() => {
      expect(newRowKey.value).toEqual('newKey');
      expect(newRowValue.value).toEqual('newValue');
      expect(onChange).toBeCalledWith([[newRowKey.value, newRowValue.value]]);
    });
  });
});
