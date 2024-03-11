/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CategoryFormField } from './category_form_field';
import { categories } from '../../containers/mock';
import { MAX_CATEGORY_LENGTH } from '../../../common/constants';
import { FormTestComponent } from '../../common/test_utils';

describe('Category', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders the category field correctly', () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
  });

  it('can submit without setting a category', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category: null }, true);
    });
  });

  it('can submit with category a string as default value', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ category: categories[0] }} onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category: categories[0] }, true);
    });
  });

  it('can submit with category with null as default value', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ category: null }} onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category: null }, true);
    });
  });

  it('cannot submit if the category is an empty string', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ category: '' }} onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, false);
    });

    expect(screen.getByText('Empty category is not allowed'));
  });

  it(`cannot submit if the category is more than ${MAX_CATEGORY_LENGTH}`, async () => {
    const category = 'a'.repeat(MAX_CATEGORY_LENGTH + 1);

    appMockRender.render(
      <FormTestComponent formDefaultValue={{ category }} onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, false);
    });

    expect(
      screen.getByText(
        'The length of the category is too long. The maximum length is 50 characters.'
      )
    );
  });

  it('can set a category from existing ones', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    userEvent.type(screen.getByRole('combobox'), `${categories[1]}{enter}`);
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category: categories[1] }, true);
    });
  });

  it('can set a new category', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    userEvent.type(screen.getByRole('combobox'), 'my new category{enter}');
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category: 'my new category' }, true);
    });
  });

  it('cannot set an empty category', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    userEvent.type(screen.getByRole('combobox'), ' {enter}');
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, false);
      expect(screen.getByText('Empty category is not allowed'));
    });
  });

  it('setting an empty category and clear it do not produce an error', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={false} availableCategories={categories} />
      </FormTestComponent>
    );

    userEvent.type(screen.getByRole('combobox'), ' {enter}');
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, false);
    });

    userEvent.click(screen.getByTestId('comboBoxClearButton'));
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, true);
    });
  });

  it('disables the component correctly when it is loading', () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CategoryFormField isLoading={true} availableCategories={categories} />
      </FormTestComponent>
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
