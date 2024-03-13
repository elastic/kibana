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
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';
import { useGetAllCaseConfigurationsResponse } from '../configure_cases/__mock__';

jest.mock('../../containers/configure/use_get_all_case_configurations');

const useGetAllCaseConfigurationsMock = useGetAllCaseConfigurations as jest.Mock;

// FLAKY: https://github.com/elastic/kibana/issues/176805
describe.skip('CustomFields', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useGetAllCaseConfigurationsMock.mockImplementation(() => ({
      ...useGetAllCaseConfigurationsResponse,
      data: [
        {
          ...useGetAllCaseConfigurationsResponse.data[0],
          customFields: customFieldsConfigurationMock,
        },
      ],
    }));
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByText(i18n.ADDITIONAL_FIELDS)).toBeInTheDocument();
    expect(await screen.findByTestId('create-case-custom-fields')).toBeInTheDocument();

    for (const item of customFieldsConfigurationMock) {
      expect(
        await screen.findByTestId(`${item.key}-${item.type}-create-custom-field`)
      ).toBeInTheDocument();
    }
  });

  it('should not show the custom fields if the configuration is empty', async () => {
    useGetAllCaseConfigurationsMock.mockImplementation(() => ({
      ...useGetAllCaseConfigurationsResponse,
      data: [
        {
          ...useGetAllCaseConfigurationsResponse.data[0],
          customFields: [],
        },
      ],
    }));

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} />
      </FormTestComponent>
    );

    expect(screen.queryByText(i18n.ADDITIONAL_FIELDS)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('create-custom-field', { exact: false }).length).toEqual(0);
  });

  it('should sort the custom fields correctly', async () => {
    const reversedCustomFieldsConfiguration = [...customFieldsConfigurationMock].reverse();

    useGetAllCaseConfigurationsMock.mockImplementation(() => ({
      ...useGetAllCaseConfigurationsResponse,
      data: [
        {
          ...useGetAllCaseConfigurationsResponse.data[0],
          customFields: reversedCustomFieldsConfiguration,
        },
      ],
    }));

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} />
      </FormTestComponent>
    );

    const customFieldsWrapper = await screen.findByTestId('create-case-custom-fields');

    const customFields = customFieldsWrapper.querySelectorAll('.euiFormRow');

    expect(customFields).toHaveLength(4);

    expect(customFields[0]).toHaveTextContent('My test label 1');
    expect(customFields[1]).toHaveTextContent('My test label 2');
    expect(customFields[2]).toHaveTextContent('My test label 3');
    expect(customFields[3]).toHaveTextContent('My test label 4');
  });

  it('should update the custom fields', async () => {
    appMockRender = createAppMockRenderer();

    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CustomFields isLoading={false} />
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
