/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EditCategoryProps } from './edit_category';
import { EditCategory } from './edit_category';
import { readCasesPermissions } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

import { waitFor, screen } from '@testing-library/react';
import { useGetCategories } from '../../../containers/use_get_categories';

jest.mock('../../../containers/use_get_categories');

const onSubmit = jest.fn();
const defaultProps: EditCategoryProps = {
  isLoading: false,
  onSubmit,
  category: '',
};

describe('EditCategory ', () => {
  let appMockRender: AppMockRenderer;
  const sampleCategories = ['foo', 'bar'];
  const fetchCategories = jest.fn();
  // const formHookMock = getFormMock({ categories: sampleCategories });
  beforeEach(() => {
    jest.resetAllMocks();
    appMockRender = createAppMockRenderer();
    // (useForm as jest.Mock).mockImplementation(() => ({ form: formHookMock }));

    (useGetCategories as jest.Mock).mockImplementation(() => ({
      data: sampleCategories,
      refetch: fetchCategories,
    }));
  });

  it('renders no categories', () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(screen.getByTestId('cases-categories')).toBeInTheDocument();
    expect(screen.getByTestId('no-categories')).toBeInTheDocument();
  });

  it('renders category value', () => {
    appMockRender.render(<EditCategory {...defaultProps} category='sample' />);

    expect(screen.getByText('sample')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    appMockRender.render(<EditCategory {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('category-loading')).toBeInTheDocument();
  });

  it('renders loading state while loading categories', () => {
    (useGetCategories as jest.Mock).mockReturnValue({ isLoading: true})
    appMockRender.render(<EditCategory {...defaultProps} />);

    expect(screen.getByTestId('category-loading')).toBeInTheDocument();
  });

  it('shows combo box on edit', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
        expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });
  });
  
  it('should select category from list', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
        expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    await waitFor(() => {
        expect(screen.getByText('foo')).toBeInTheDocument();
        userEvent.click(screen.getByText('foo'));
    });
   
    await waitFor(() => {
        expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('foo');
        userEvent.click(screen.getByTestId('edit-category-submit'));
    });

    await waitFor(() => 
    expect(onSubmit).toBeCalledWith('foo')
    );
  });

  it('should add new category', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
        expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    userEvent.type(screen.getByTestId('comboBoxInput'), 'new{enter}');

    await waitFor(() => {
        expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('new');
    });
   
    await waitFor(() => {
        userEvent.click(screen.getByTestId('edit-category-submit'));
    });

    await waitFor(() => 
    expect(onSubmit).toBeCalledWith('new')
    );
  });

  it('should not save category on cancel click', async () => {
    appMockRender.render(<EditCategory {...defaultProps} />);

    userEvent.click(screen.getByTestId('category-edit-button'));

    await waitFor(() => {
        expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    });

    userEvent.type(screen.getByTestId('comboBoxInput'), 'new{enter}');

    await waitFor(() => {
        expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('new');
    });
   
    await waitFor(() => {
        userEvent.click(screen.getByTestId('edit-category-cancel'));
    });

    await waitFor(() => {
    expect(onSubmit).not.toBeCalled();
    expect(screen.getByTestId('no-categories')).toBeInTheDocument();
  });
  });

  it('does not show edit button when the user does not have update permissions', () => {
    let newAppMockRenderer = createAppMockRenderer({ permissions: readCasesPermissions() });

    newAppMockRenderer.render(
         <EditCategory {...defaultProps} />
      );

    expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument();
  });
});
