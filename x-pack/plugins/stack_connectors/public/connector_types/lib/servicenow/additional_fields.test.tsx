/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AdditionalFields } from './additional_fields';
import userEvent from '@testing-library/user-event';

describe('Credentials', () => {
  const onChange = jest.fn();
  const value = JSON.stringify({ foo: 'test' });
  const props = { value, errors: [], onChange };

  it('renders the additional fields correctly', async () => {
    render(
      <IntlProvider locale="en">
        <AdditionalFields {...props} />
      </IntlProvider>
    );

    expect(await screen.findByTestId('additionalFields')).toBeInTheDocument();
  });

  it('sets the value correctly', async () => {
    render(
      <IntlProvider locale="en">
        <AdditionalFields {...props} />
      </IntlProvider>
    );

    expect(await screen.findByText(value)).toBeInTheDocument();
  });

  it('changes the value correctly', async () => {
    const newValue = JSON.stringify({ bar: 'test' });

    render(
      <IntlProvider locale="en">
        <AdditionalFields {...props} value={undefined} />
      </IntlProvider>
    );

    userEvent.paste(await screen.findByTestId('additional_fieldsJsonEditor'), newValue);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(newValue);
    });

    expect(await screen.findByText(newValue)).toBeInTheDocument();
  });

  it('updating wth an empty string sets its value to null', async () => {
    const newValue = JSON.stringify({ bar: 'test' });

    render(
      <IntlProvider locale="en">
        <AdditionalFields {...props} value={undefined} />
      </IntlProvider>
    );

    const editor = await screen.findByTestId('additional_fieldsJsonEditor');

    userEvent.paste(editor, newValue);
    userEvent.clear(editor);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });
});
