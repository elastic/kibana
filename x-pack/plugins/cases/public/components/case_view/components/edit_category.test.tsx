/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EditCategoryProps } from './edit_category';
import { EditCategory } from './edit_category';
import userEvent, { type UserEvent } from '@testing-library/user-event';
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
  let user: UserEvent;
  let appMockRender: AppMockRenderer;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    appMockRender = createAppMockRenderer();

    useGetCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Shows the category header', () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders no categories', () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(screen.getByTestId('cases-categories')).toBeInTheDocument();
    expect(screen.getByTestId('no-categories')).toBeInTheDocument();
  });

  it('renders category value', () => {
    appMockRender.render(<EditCategory {...defaultProps} category="sample" />);

    expect(screen.getByText('sample')).toBeInTheDocument();
    expect(screen.queryByTestId('no-categories')).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    appMockRender.render(<EditCategory {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('category-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument();
  });

  it('renders loading state while loading categories', async () => {
    useGetCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: true,
    });

    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(screen.getByTestId('category-loading')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument()
    );
  });

  it('shows combo box on edit', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });
  });

  it('should select category from list', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('combobox'), `${categories[0]}{enter}`);

    await waitFor(() => {
      expect(screen.getByTestId('edit-category-submit')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(categories[0]));
  });

  it('should add new category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('combobox'), 'new{enter}');

    await waitFor(() => {
      expect(screen.getByTestId('edit-category-submit')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith('new'));
  });

  it('should trim category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('combobox'), 'category-with-space            {enter}');

    await waitFor(() => {
      expect(screen.getByTestId('edit-category-submit')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith('category-with-space'));
  });

  it('should not save category on cancel click', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('combobox'), 'new{enter}');

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('new');
    });

    await user.click(screen.getByTestId('edit-category-cancel'));

    await waitFor(() => {
      expect(onSubmit).not.toBeCalled();
      expect(screen.getByTestId('no-categories')).toBeInTheDocument();
    });
  });

  it('should be able to remove category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category={'My category'} />);

    expect(screen.getByText('My category')).toBeInTheDocument();

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('comboBoxClearButton'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-category-submit')).not.toBeDisabled();
    });

    await user.click(screen.getByTestId('edit-category-submit'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(null));
  });

  it('should disabled the save button on error', async () => {
    const bigCategory = 'a'.repeat(51);

    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('combobox'), `${bigCategory}{enter}`);

    await waitFor(() => {
      expect(
        screen.getByText(
          'The length of the category is too long. The maximum length is 50 characters.'
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-category-submit')).toBeDisabled();
  });

  it('should disabled the save button on empty state', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-category-submit')).toBeDisabled();
  });

  it('should disabled the save button when not changing category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category={'My category'} />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
      expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('My category');
    });

    expect(screen.getByTestId('edit-category-submit')).toBeDisabled();
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

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
      expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('My category');
    });

    await user.click(screen.getByTestId('edit-category-cancel'));

    rerender(<EditCategory {...defaultProps} category="category from the API" />);

    await user.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('categories-list')).toBeInTheDocument();
      expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('category from the API');
    });
  });

  it('removes the category correctly using the cross button', async () => {
    appMockRender.render(<EditCategory {...defaultProps} category="My category" />);

    await waitFor(() => {
      expect(screen.getByText('My category')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('category-remove-button'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(null));
  });
});
