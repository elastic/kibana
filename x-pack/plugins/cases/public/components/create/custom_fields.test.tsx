/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, readCasesPermissions } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { CustomFields } from './custom_fields';
import userEvent from '@testing-library/user-event';

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

    expect(screen.getByTestId('create-case-custom-fields')).toBeInTheDocument();

    for (const item of customFieldsConfigurationMock) {
      expect(
        screen.getByTestId(`${item.label}-${item.type}-create-custom-field`)
      ).toBeInTheDocument();
    }
  });

  it('should not show the custom fields if the configuration is empty', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={[]} />
      </FormTestComponent>
    );

    expect(screen.queryAllByTestId('create-custom-field', { exact: false }).length).toEqual(0);
  });

  it('should not show the custom fields when no permissions to create', async () => {
    appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} customFieldsConfiguration={customFieldsConfigurationMock} />
      </FormTestComponent>
    );

    expect(screen.queryAllByTestId('create-custom-field', { exact: false }).length).toEqual(0);
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
      screen.getByTestId(`${textField.label}-${textField.type}-create-custom-field`),
      'hello'
    );
    userEvent.click(
      screen.getByTestId(`${toggleField.label}-${toggleField.type}-create-custom-field`)
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          [textField.key]: 'hello',
          [toggleField.key]: true,
        },
        true
      );
    });
  });
});
