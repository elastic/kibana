/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CategoryComponentProps } from './category_component';
import { CategoryComponent } from './category_component';
import { waitFor, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';

const onChange = jest.fn();
const defaultProps: CategoryComponentProps = {
  isLoading: false,
  onChange,
  availableCategories: ['foo', 'bar'],
};

describe('Category ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list correctly', async () => {
    render(<CategoryComponent {...defaultProps} />);

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
  });

  it('renders loading correctly', async () => {
    render(<CategoryComponent {...defaultProps} isLoading={true} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
  });

  it('is disabled when loading', async () => {
    render(<CategoryComponent {...defaultProps} isLoading={true} />);

    expect(await screen.findByRole('combobox')).toBeDisabled();
  });

  it('renders category correctly', async () => {
    render(<CategoryComponent {...defaultProps} category="new-category" />);

    expect(await screen.findByRole('combobox')).toHaveValue('new-category');
  });

  it('renders allow to add new category option', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(await screen.findByRole('combobox'), 'new{enter}');

    expect(onChange).toBeCalledWith('new');
    expect(await screen.findByRole('combobox')).toHaveValue('new');
  });

  it('renders current option list', async () => {
    render(<CategoryComponent {...defaultProps} />);
    await showEuiComboBoxOptions();

    expect(await screen.findByText('foo')).toBeInTheDocument();
    expect(await screen.findByText('bar')).toBeInTheDocument();
  });

  it('should call onChange when changing an option', async () => {
    render(<CategoryComponent {...defaultProps} />);
    await showEuiComboBoxOptions();

    userEvent.click(await screen.findByText('foo'));

    expect(onChange).toHaveBeenCalledWith('foo');
    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('foo');
  });

  it('should call onChange when adding new category', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(await screen.findByRole('combobox'), 'hi{enter}');

    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('hi');
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi');
    });
  });

  it('should add case sensitive text', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(await screen.findByRole('combobox'), 'hi{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi');
    });

    userEvent.type(await screen.findByRole('combobox'), ' there{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi there');
    });
  });
});
