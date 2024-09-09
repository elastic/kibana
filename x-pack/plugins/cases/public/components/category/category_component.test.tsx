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

  it('renders list correctly', () => {
    render(<CategoryComponent {...defaultProps} />);

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
  });

  it('renders loading correctly', () => {
    render(<CategoryComponent {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<CategoryComponent {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('renders category correctly', () => {
    render(<CategoryComponent {...defaultProps} category="new-category" />);

    expect(screen.getByRole('combobox')).toHaveValue('new-category');
  });

  it('renders allow to add new category option', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(screen.getByRole('combobox'), 'new{enter}');
    await waitFor(() => {
      expect(onChange).toBeCalledWith('new');
    });
  });

  it('renders current option list', async () => {
    render(<CategoryComponent {...defaultProps} />);
    await showEuiComboBoxOptions();

    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  it('should call onChange when changing an option', async () => {
    render(<CategoryComponent {...defaultProps} />);
    await showEuiComboBoxOptions();

    userEvent.click(screen.getByText('foo'));

    expect(onChange).toHaveBeenCalledWith('foo');
  });

  it('should call onChange when adding new category', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(screen.getByRole('combobox'), 'hi{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi');
    });
  });

  it('should add case sensitive text', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(screen.getByRole('combobox'), 'hi{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi');
    });

    userEvent.type(screen.getByRole('combobox'), ' there{enter}');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('there');
    });
  });
});
