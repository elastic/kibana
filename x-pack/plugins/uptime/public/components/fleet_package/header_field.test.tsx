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
  const label = 'Sample label';
  const isInvalid = false;
  const defaultValue = {};

  it('renders HeaderField', () => {
    const { getByText, queryByText } = render(
      <HeaderField
        defaultValue={defaultValue}
        label={label}
        isInvalid={isInvalid}
        onChange={onChange}
      />
    );

    expect(getByText(label)).toBeInTheDocument();
    expect(queryByText('Header key must be a valid HTTP token')).not.toBeInTheDocument();
  });

  it('formats headers and handles onChange', async () => {
    const { getByTestId } = render(
      <HeaderField
        defaultValue={defaultValue}
        label={label}
        isInvalid={isInvalid}
        onChange={onChange}
      />
    );
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

  it('handles unchecking headers', async () => {
    const { getByTestId } = render(
      <HeaderField
        defaultValue={defaultValue}
        label={label}
        isInvalid={isInvalid}
        onChange={onChange}
      />
    );
    const checkbox = getByTestId('keyValuePairsCheckbox0') as HTMLInputElement;
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

    // uncheck
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(onChange).toBeCalledWith({});
    });

    // check
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        [newKey]: newValue,
      });
    });
  });

  it('handles content mode', async () => {
    const contentMode: Mode = Mode.TEXT;
    render(
      <HeaderField
        defaultValue={defaultValue}
        label={label}
        isInvalid={isInvalid}
        onChange={onChange}
        contentMode={contentMode}
      />
    );

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        'Content-Type': contentTypes[Mode.TEXT],
      });
    });
  });

  it('handles isInvalid', async () => {
    const contentMode: Mode = Mode.TEXT;
    const { getByText } = render(
      <HeaderField
        defaultValue={defaultValue}
        label={label}
        isInvalid={true}
        onChange={onChange}
        contentMode={contentMode}
      />
    );

    expect(getByText('Header key must be a valid HTTP token')).toBeInTheDocument();
  });
});
