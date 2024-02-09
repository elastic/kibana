/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EditCategoryProps } from './edit_category';
import { EditCategory } from './edit_category';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer, readCasesPermissions } from '../../../common/mock';

import { waitFor, screen } from '@testing-library/react';
import { useGetCategories } from '../../../containers/use_get_categories';
import { categories } from '../../../containers/mock';

jest.mock('../../../containers/use_get_categories');

const onSubmit = jest.fn();

const defaultProps: EditCategoryProps = {
  isLoading: false,
  onSubmit,
  category: null,
};

const useGetCategoriesMock = useGetCategories as jest.Mock;

describe('EditCategory ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.resetAllMocks();
    appMockRender = createAppMockRenderer();

    useGetCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: false,
    });
  });

  it('Shows the category header', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(await screen.findByText('Category')).toBeInTheDocument();
  });

  it('renders no categories', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(await screen.findByTestId('cases-categories')).toBeInTheDocument();
    expect(await screen.findByTestId('no-categories')).toBeInTheDocument();
  });

  it('renders category value', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category="sample" />);

    expect(await screen.findByText('sample')).toBeInTheDocument();
    expect(screen.queryByTestId('no-categories')).not.toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(<EditCategory {...defaultProps} isLoading={true} />);

    expect(await screen.findByTestId('category-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument();
  });

  it('renders loading state while loading categories', async () => {
    useGetCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: true,
    });

    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(await screen.findByTestId('category-loading')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument()
    );
  });

  it('shows combo box on edit', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
  });

  it('should select category from list', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.type(await screen.findByRole('combobox'), `${categories[0]}{enter}`);

    expect(await screen.findByTestId('edit-category-submit')).not.toBeDisabled();

    userEvent.click(await screen.findByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(categories[0]));
  });

  it('should add new category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.type(await screen.findByRole('combobox'), 'new{enter}');

    expect(await screen.findByTestId('edit-category-submit')).not.toBeDisabled();

    userEvent.click(await screen.findByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith('new'));
  });

  it('should trim category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.type(await screen.findByRole('combobox'), 'category-with-space            {enter}');

    expect(await screen.findByTestId('edit-category-submit')).not.toBeDisabled();

    userEvent.click(await screen.findByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith('category-with-space'));
  });

  it('should not save category on cancel click', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.type(await screen.findByRole('combobox'), 'new{enter}');

    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('new');

    userEvent.click(await screen.findByTestId('edit-category-cancel'));

    expect(await screen.findByTestId('no-categories')).toBeInTheDocument();
    await waitFor(() => {
      expect(onSubmit).not.toBeCalled();
    });
  });

  it('should be able to remove category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category={'My category'} />);

    expect(await screen.findByText('My category')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('comboBoxClearButton'));

    expect(await screen.findByTestId('edit-category-submit')).not.toBeDisabled();

    userEvent.click(await screen.findByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(null));
  });

  it('should disabled the save button on error', async () => {
    const bigCategory = 'a'.repeat(51);

    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    userEvent.type(await screen.findByRole('combobox'), `${bigCategory}{enter}`);

    expect(
      await screen.findByText(
        'The length of the category is too long. The maximum length is 50 characters.'
      )
    ).toBeInTheDocument();

    expect(await screen.findByTestId('edit-category-submit')).toBeDisabled();
  });

  it('should disabled the save button on empty state', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();

    expect(await screen.findByTestId('edit-category-submit')).toBeDisabled();
  });

  it('should disabled the save button when not changing category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category={'My category'} />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('My category');

    expect(await screen.findByTestId('edit-category-submit')).toBeDisabled();
  });

  it('does not show edit button when the user does not have update permissions', () => {
    const newAppMockRenderer = createAppMockRenderer({ permissions: readCasesPermissions() });

    newAppMockRenderer.render(<EditCategory {...defaultProps} />);

    expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument();
  });

  it('should set the category correctly if it is updated', async () => {
    const { rerender } = appMockRender.render(
      <EditCategory {...defaultProps} category={'My category'} />
    );

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('My category');

    userEvent.click(await screen.findByTestId('edit-category-cancel'));

    rerender(<EditCategory {...defaultProps} category="category from the API" />);

    userEvent.click(await screen.findByTestId('category-edit-button'));

    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('category from the API');
  });

  it('removes the category correctly using the cross button', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category="My category" />);

    expect(await screen.findByText('My category')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('category-remove-button'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(null));
  });
});
