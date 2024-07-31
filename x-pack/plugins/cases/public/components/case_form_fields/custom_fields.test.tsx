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

describe('CustomFields', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  const defaultProps = {
    configurationCustomFields: customFieldsConfigurationMock,
    isLoading: false,
    setCustomFieldsOptional: false,
    isEditMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    const cf0 = customFieldsConfigurationMock[0];
    const cf1 = customFieldsConfigurationMock[1];

    expect(
      await screen.findByTestId(`${cf0.key}-${cf0.type}-create-custom-field`)
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId(`${cf1.key}-${cf1.type}-create-custom-field`)
    ).toBeInTheDocument();
  });

  it('should not show the custom fields if the configuration is empty', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields
          isLoading={false}
          setCustomFieldsOptional={false}
          configurationCustomFields={[]}
        />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('caseCustomFields')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('create-custom-field', { exact: false }).length).toEqual(0);
  });

  it('should render as optional fields for text custom fields', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields
          isLoading={false}
          configurationCustomFields={customFieldsConfigurationMock}
          setCustomFieldsOptional={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findAllByTestId('form-optional-field-label')).toHaveLength(2);
  });

  it('should not set default value when in edit mode', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields
          isLoading={false}
          configurationCustomFields={[customFieldsConfigurationMock[0]]}
          setCustomFieldsOptional={false}
          isEditMode={true}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByText(`${customFieldsConfigurationMock[0].defaultValue}`)
    ).not.toBeInTheDocument();
  });

  it('should sort the custom fields correctly', async () => {
    const reversedCustomFieldsConfiguration = [...customFieldsConfigurationMock].reverse();

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields
          isLoading={false}
          setCustomFieldsOptional={false}
          configurationCustomFields={reversedCustomFieldsConfiguration}
        />
      </FormTestComponent>
    );

    const customFieldsWrapper = await screen.findByTestId('caseCustomFields');

    const customFields = customFieldsWrapper.querySelectorAll('.euiFormRow');

    expect(customFields).toHaveLength(4);

    expect(customFields[0]).toHaveTextContent('My test label 1');
    expect(customFields[1]).toHaveTextContent('My test label 2');
    expect(customFields[2]).toHaveTextContent('My test label 3');
    expect(customFields[3]).toHaveTextContent('My test label 4');
  });

  it('should update the custom fields', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields {...defaultProps} />
      </FormTestComponent>
    );

    const textField = customFieldsConfigurationMock[2];
    const toggleField = customFieldsConfigurationMock[3];

    userEvent.type(
      await screen.findByTestId(`${textField.key}-${textField.type}-create-custom-field`),
      'hello'
    );
    userEvent.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldsConfigurationMock[0].key]: customFieldsConfigurationMock[0].defaultValue,
            [customFieldsConfigurationMock[1].key]: customFieldsConfigurationMock[1].defaultValue,
            [textField.key]: 'hello',
            [toggleField.key]: true,
          },
        },
        true
      );
    });
  });
});
