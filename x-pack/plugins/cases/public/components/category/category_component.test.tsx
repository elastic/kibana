/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CategoryComponentProps } from './category_component';
import { CategoryComponent } from './category_component';
import { waitFor, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const onChange = jest.fn();
const defaultProps: CategoryComponentProps = {
  isLoading: false,
  onChange,
  availableCategories: ['foo', 'bar'],
};

describe('Category ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

    expect(screen.getByTestId('comboBoxSearchInput')).toHaveAttribute('disabled');
  });

  it('renders category correctly', () => {
    render(<CategoryComponent {...defaultProps} category="new-category" />);

    expect(screen.getByText('new-category')).toBeInTheDocument();
  });

  it('renders allow to add new category option', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'new');

    await waitFor(() => {
      expect(
        screen.getByTestId('comboBoxOptionsList categories-list-optionsList')
      ).toBeInTheDocument();
    });
  });

  it('renders current option list', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    await waitFor(() => {
      expect(
        screen.getByTestId('comboBoxOptionsList categories-list-optionsList')
      ).toBeInTheDocument();
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });
  });

  it('should call onChange when changing an option', async () => {
    render(<CategoryComponent {...defaultProps} />);

    userEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('foo'));
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('foo');
      expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('foo');
    });
  });

  it('should call onChange when adding new category', async () => {
    render(<CategoryComponent {...defaultProps} />);

    await userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'hi{enter}', { delay: 1 });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('hi');
      expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('hi');
    });
  });
});

