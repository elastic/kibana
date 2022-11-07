/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tags } from './tags';

describe('Tags', () => {
  const onChange = jest.fn();

  const options = {
    values: [],
    onChange,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders tags initially', () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    expect(screen.getByText('super')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('clears the tags', async () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    userEvent.click(screen.getByTestId('comboBoxClearButton'));

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [],
        ]
      `)
    );
  });

  it('calls onChange when removing a tag', async () => {
    render(<Tags {...{ ...options, values: ['super', 'hello'] }} />);

    userEvent.click(screen.getByTitle('Remove super from selection in this group'));

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [
            "hello",
          ],
        ]
      `)
    );
  });

  it('calls onChange when adding a tag', async () => {
    render(<Tags {...options} />);

    userEvent.click(screen.getByTestId('opsgenie-tags'));
    userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'awesome{enter}');

    await waitFor(() =>
      expect(onChange.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "tags",
          Array [
            "awesome",
          ],
        ]
      `)
    );
  });
});
