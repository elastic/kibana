/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { ResponseBodyIndexField } from './index_response_body_field';
import { ResponseBodyIndexPolicy } from './types';

describe('<ResponseBodyIndexField/>', () => {
  const defaultDefaultValue = ResponseBodyIndexPolicy.ON_ERROR;
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const WrappedComponent = ({ defaultValue = defaultDefaultValue }) => {
    return (
      <ResponseBodyIndexField defaultValue={defaultValue} onChange={onChange} onBlur={onBlur} />
    );
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders ResponseBodyIndexField', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const select = getByTestId('indexResponseBodyFieldSelect') as HTMLInputElement;
    expect(select.value).toEqual(defaultDefaultValue);
    expect(getByText('On error')).toBeInTheDocument();
    expect(getByText('Index response body')).toBeInTheDocument();
  });

  it('handles select change', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const select = getByTestId('indexResponseBodyFieldSelect') as HTMLInputElement;
    const newPolicy = ResponseBodyIndexPolicy.ALWAYS;
    expect(select.value).toEqual(defaultDefaultValue);

    fireEvent.change(select, { target: { value: newPolicy } });

    await waitFor(() => {
      expect(select.value).toBe(newPolicy);
      expect(getByText('Always')).toBeInTheDocument();
      expect(onChange).toBeCalledWith(newPolicy);
    });
  });

  it('calls onBlur', async () => {
    const { getByTestId } = render(<WrappedComponent />);
    const select = getByTestId('indexResponseBodyFieldSelect') as HTMLInputElement;
    const newPolicy = ResponseBodyIndexPolicy.ALWAYS;

    fireEvent.change(select, { target: { value: newPolicy } });
    fireEvent.blur(select);

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('handles checkbox change', async () => {
    const { getByTestId, getByLabelText } = render(<WrappedComponent />);
    const checkbox = getByLabelText('Index response body') as HTMLInputElement;
    const select = getByTestId('indexResponseBodyFieldSelect') as HTMLInputElement;
    const newPolicy = ResponseBodyIndexPolicy.NEVER;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox.checked).toBe(false);
      expect(select).not.toBeInTheDocument();
      expect(onChange).toBeCalledWith(newPolicy);
    });

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
      expect(select).not.toBeInTheDocument();
      expect(onChange).toBeCalledWith(defaultDefaultValue);
    });
  });

  it('handles ResponseBodyIndexPolicy.NEVER as a default value', async () => {
    const { queryByTestId, getByTestId, getByLabelText } = render(
      <WrappedComponent defaultValue={ResponseBodyIndexPolicy.NEVER} />
    );
    const checkbox = getByLabelText('Index response body') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(
      queryByTestId('indexResponseBodyFieldSelect') as HTMLInputElement
    ).not.toBeInTheDocument();

    fireEvent.click(checkbox);
    const select = getByTestId('indexResponseBodyFieldSelect') as HTMLInputElement;

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
      expect(select).toBeInTheDocument();
      expect(select.value).toEqual(ResponseBodyIndexPolicy.ON_ERROR);
      // switches back to on error policy when checkbox is checked
      expect(onChange).toBeCalledWith(ResponseBodyIndexPolicy.ON_ERROR);
    });

    const newPolicy = ResponseBodyIndexPolicy.ALWAYS;
    fireEvent.change(select, { target: { value: newPolicy } });

    await waitFor(() => {
      expect(select.value).toEqual(newPolicy);
      expect(onChange).toBeCalledWith(newPolicy);
    });
  });
});
