/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { FormProps } from './schema';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { CasesConfigurationUI } from '../../../common/ui';
import { CustomFieldTypes } from '../../../common/types/domain';
import { CustomFields } from './custom_fields';
import { EuiButton } from '@elastic/eui';

describe('CustomFields', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();
  const customFieldsConfigurationMock: CasesConfigurationUI['customFields'] = [
    {
      key: 'random_custom_key',
      label: 'Summary',
      type: CustomFieldTypes.TEXT,
      required: true,
    },
    {
      key: 'random_custom_key_2',
      label: 'Maintenance',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    },
  ];

  const FormComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({ onSubmit });

    return (
      <Form form={form}>
        {children}
        <EuiButton onClick={() => form.submit()}>{'Submit'}</EuiButton>
      </Form>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(
      <FormComponent>
        <CustomFields isLoading={false} customFieldsConfiguration={customFieldsConfigurationMock}  />
      </FormComponent>
    );

    for(const item of customFieldsConfigurationMock) {
      expect(screen.getByTestId(`${item.label}-${item.type}-create-custom-field`)).toBeInTheDocument();
    } 
  });

  // it('renders alphabetically', () => {
  //   appMockRender.render(
  //     <FormComponent>
  //       <CustomFields isLoading={false} customFieldsConfiguration={customFieldsConfigurationMock}  />
  //     </FormComponent>
  //   );

  //   const customFields = screen.getAllByTestId('create-case-custom-field-wrapper', { exact: false });

  //   expect(customFields.length).toBe(2);

  //   expect(within(customFields[0]).getByRole('heading')).toHaveTextContent('My test label 1');
  //   expect(within(customFields[1]).getByRole('heading')).toHaveTextContent('My test label 2');
  // });

  // it('shows the optional label correctly', () => {
  //   appMockRender.render(
  //     <FormComponent>
  //       <Category isLoading={false} />
  //     </FormComponent>
  //   );

  //   expect(screen.getByText('Optional')).toBeInTheDocument();
  // });

  // it('disables the combobox when it is loading', () => {
  //   appMockRender.render(
  //     <FormComponent>
  //       <Category isLoading={true} />
  //     </FormComponent>
  //   );

  //   expect(screen.getByRole('combobox')).toBeDisabled();
  // });

  // it('disables the combobox when is loading categories', async () => {
  //   useGetCategoriesMock.mockReturnValue({ isLoading: true, data: categories });

  //   appMockRender.render(
  //     <FormComponent>
  //       <Category isLoading={false} />
  //     </FormComponent>
  //   );

  //   await waitFor(() => {
  //     expect(screen.getByRole('combobox')).toBeDisabled();
  //   });
  // });

  // it('can set the categories returned from the useGetCategories correctly ', async () => {
  //   const category = 'test';

  //   useGetCategoriesMock.mockReturnValue(() => ({ isLoading: true, data: [category] }));

  //   appMockRender.render(
  //     <FormComponent>
  //       <Category isLoading={false} />
  //     </FormComponent>
  //   );

  //   userEvent.type(screen.getByRole('combobox'), `${category}{enter}`);
  //   userEvent.click(screen.getByText('Submit'));

  //   await waitFor(() => {
  //     // data, isValid
  //     expect(onSubmit).toBeCalledWith({ category }, true);
  //   });
  // });
});
