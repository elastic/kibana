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
import { FormTestComponent } from '../../common/test_utils';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { CustomFields } from './custom_fields';
import * as i18n from './translations';

describe('CustomFields', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={customFieldsConfigurationMock} />
      </FormTestComponent>
    );

    expect(screen.getByText(i18n.ADDITIONAL_FIELDS)).toBeInTheDocument();
    expect(screen.getByTestId('create-case-custom-fields')).toBeInTheDocument();

    for (const item of customFieldsConfigurationMock) {
      expect(
        screen.getByTestId(`${item.key}-${item.type}-create-custom-field`)
      ).toBeInTheDocument();
    }
  });

  it('should not show the custom fields if the configuration is empty', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={[]} />
      </FormTestComponent>
    );

    expect(screen.queryByText(i18n.ADDITIONAL_FIELDS)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('create-custom-field', { exact: false }).length).toEqual(0);
  });

  it('should sort the custom fields correctly', async () => {
    const reversedConfiguration = [...customFieldsConfigurationMock].reverse();

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={reversedConfiguration} />
      </FormTestComponent>
    );

    const customFieldsWrapper = await screen.findByTestId('create-case-custom-fields');

    const customFields = customFieldsWrapper.querySelectorAll('.euiFormRow');

    expect(customFields).toHaveLength(2);

    expect(customFields[0]).toHaveTextContent('My test label 1');
    expect(customFields[1]).toHaveTextContent('My test label 2');
  });

  it('should update the custom fields', async () => {
    appMockRender = createAppMockRenderer();

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={customFieldsConfigurationMock} />
      </FormTestComponent>
    );

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[1];

    userEvent.type(
      screen.getByTestId(`${textField.key}-${textField.type}-create-custom-field`),
      'hello'
    );
    userEvent.click(
      screen.getByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [textField.key]: 'hello',
            [toggleField.key]: true,
          },
        },
        true
      );
    });
  });
});
