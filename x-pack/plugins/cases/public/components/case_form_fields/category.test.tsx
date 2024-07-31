/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { Category } from './category';
import { useGetCategories } from '../../containers/use_get_categories';
import { categories } from '../../containers/mock';
import { EuiButton } from '@elastic/eui';

jest.mock('../../containers/use_get_categories');

const useGetCategoriesMock = useGetCategories as jest.Mock;

describe('Category', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  const FormComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm({ onSubmit });

    return (
      <Form form={form}>
        {children}
        <EuiButton onClick={() => form.submit()}>{'Submit'}</EuiButton>
      </Form>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCategoriesMock.mockReturnValue({ isLoading: false, data: categories });
    appMockRender = createAppMockRenderer();
  });

  it('renders the category field correctly', () => {
    appMockRender.render(
      <FormComponent>
        <Category isLoading={false} />
      </FormComponent>
    );

    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
  });

  it('shows the optional label correctly', () => {
    appMockRender.render(
      <FormComponent>
        <Category isLoading={false} />
      </FormComponent>
    );

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('disables the combobox when it is loading', () => {
    appMockRender.render(
      <FormComponent>
        <Category isLoading={true} />
      </FormComponent>
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('disables the combobox when is loading categories', async () => {
    useGetCategoriesMock.mockReturnValue({ isLoading: true, data: categories });

    appMockRender.render(
      <FormComponent>
        <Category isLoading={false} />
      </FormComponent>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  it('can set the categories returned from the useGetCategories correctly ', async () => {
    const category = 'test';

    useGetCategoriesMock.mockReturnValue(() => ({ isLoading: true, data: [category] }));

    appMockRender.render(
      <FormComponent>
        <Category isLoading={false} />
      </FormComponent>
    );

    userEvent.type(screen.getByRole('combobox'), `${category}{enter}`);
    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ category }, true);
    });
  });
});
