/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';

import type { AppMockRenderer } from '../../../common/mock';
import { readCasesPermissions, createAppMockRenderer } from '../../../common/mock';

import { CustomFields } from './custom_fields';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';

describe('Case View Page files tab', () => {
  const onSubmit = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the custom fields correctly', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByTestId('case-custom-field-wrapper-test_key_1')).toBeInTheDocument();
    expect(screen.getByTestId('case-custom-field-wrapper-test_key_2')).toBeInTheDocument();
  });

  it('should render the custom fields types when the custom fields are empty', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={[]}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByTestId('case-custom-field-wrapper-test_key_1')).toBeInTheDocument();
    expect(screen.getByTestId('case-custom-field-wrapper-test_key_2')).toBeInTheDocument();
  });

  it('should not show the custom fields if the configuration is empty', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={[]}
        onSubmit={onSubmit}
      />
    );

    expect(screen.queryByTestId('case-custom-field-wrapper-test_key_1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-custom-field-wrapper-test_key_2')).not.toBeInTheDocument();
  });

  it('should sort the custom fields correctly', async () => {
    const reversedConfiguration = [...customFieldsConfigurationMock].reverse();

    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={[]}
        customFieldsConfiguration={reversedConfiguration}
        onSubmit={onSubmit}
      />
    );

    const customFields = screen.getAllByTestId('case-custom-field-wrapper', { exact: false });

    expect(customFields.length).toBe(2);

    expect(within(customFields[0]).getByRole('heading')).toHaveTextContent('My test label 1');
    expect(within(customFields[1]).getByRole('heading')).toHaveTextContent('My test label 2');
  });

  it('pass the permissions to custom fields correctly', async () => {
    appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });

    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    expect(
      screen.queryByTestId('case-text-custom-field-edit-button-test_key_1')
    ).not.toBeInTheDocument();
  });
});
