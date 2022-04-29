/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { HeaderField, contentTypes } from './header_field';
import { Mode } from './types';

describe('<HeaderField />', () => {
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const defaultValue = {};

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders HeaderField', () => {
    const { getByText, getByTestId } = render(
      <HeaderField defaultValue={{ sample: 'header' }} onChange={onChange} />
    );

    expect(getByText('Key')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const value = getByTestId('keyValuePairsValue0') as HTMLInputElement;
    expect(key.value).toEqual('sample');
    expect(value.value).toEqual('header');
  });

  it('calls onBlur', () => {
    const { getByTestId } = render(
      <HeaderField defaultValue={{ sample: 'header' }} onChange={onChange} onBlur={onBlur} />
    );

    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const value = getByTestId('keyValuePairsValue0') as HTMLInputElement;

    fireEvent.blur(key);
    fireEvent.blur(value);

    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('formats headers and handles onChange', async () => {
    const { getByTestId, getByText } = render(
      <HeaderField defaultValue={defaultValue} onChange={onChange} />
    );
    const addHeader = getByText('Add header');
    fireEvent.click(addHeader);
    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const value = getByTestId('keyValuePairsValue0') as HTMLInputElement;
    const newKey = 'sampleKey';
    const newValue = 'sampleValue';
    fireEvent.change(key, { target: { value: newKey } });
    fireEvent.change(value, { target: { value: newValue } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        [newKey]: newValue,
      });
    });
  });

  it('handles deleting headers', async () => {
    const { getByTestId, getByText, getByLabelText } = render(
      <HeaderField defaultValue={{ sampleKey: 'sampleValue' }} onChange={onChange} />
    );
    const addHeader = getByText('Add header');

    fireEvent.click(addHeader);

    const key = getByTestId('keyValuePairsKey0') as HTMLInputElement;
    const value = getByTestId('keyValuePairsValue0') as HTMLInputElement;
    const newKey = 'sampleKey';
    const newValue = 'sampleValue';
    fireEvent.change(key, { target: { value: newKey } });
    fireEvent.change(value, { target: { value: newValue } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        [newKey]: newValue,
      });
    });

    const deleteBtn = getByLabelText('Delete item number 2, sampleKey:sampleValue');

    // uncheck
    fireEvent.click(deleteBtn);
  });

  it('handles content mode', async () => {
    const contentMode: Mode = Mode.PLAINTEXT;
    render(
      <HeaderField defaultValue={defaultValue} onChange={onChange} contentMode={contentMode} />
    );

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        'Content-Type': contentTypes[Mode.PLAINTEXT],
      });
    });
  });
});
