/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';

import type { AppMockRenderer } from '../../../common/mock';
import { readCasesPermissions, createAppMockRenderer } from '../../../common/mock';

import { CustomFields } from './custom_fields';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import { CustomFieldTypes } from '../../../../common/types/domain';

describe('Case View Page files tab', () => {
  const onSubmit = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
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

    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_1')).toBeInTheDocument();
    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_2')).toBeInTheDocument();
    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_3')).toBeInTheDocument();
    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_4')).toBeInTheDocument();
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

    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_1')).toBeInTheDocument();
    expect(await screen.findByTestId('case-custom-field-wrapper-test_key_2')).toBeInTheDocument();
  });

  it('should not show the custom fields if the configuration is empty', () => {
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

    const customFields = await screen.findAllByTestId('case-custom-field-wrapper', {
      exact: false,
    });

    expect(customFields.length).toBe(4);

    expect(await within(customFields[0]).findByRole('heading')).toHaveTextContent(
      'My test label 1'
    );
    expect(await within(customFields[1]).findByRole('heading')).toHaveTextContent(
      'My test label 2'
    );
    expect(await within(customFields[2]).findByRole('heading')).toHaveTextContent(
      'My test label 3'
    );
    expect(await within(customFields[3]).findByRole('heading')).toHaveTextContent(
      'My test label 4'
    );
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

  it('removes extra custom fields', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={[customFieldsConfigurationMock[1]]}
        onSubmit={onSubmit}
      />
    );

    userEvent.click(await screen.findByRole('switch'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        type: CustomFieldTypes.TOGGLE,
        key: 'test_key_2',
        value: false,
      });
    });
  });

  it('updates an existing toggle field correctly', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    userEvent.click((await screen.findAllByRole('switch'))[0]);

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        type: CustomFieldTypes.TOGGLE,
        key: 'test_key_2',
        value: false,
      });
    });
  });

  it('updates new toggle field correctly', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={[]}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    userEvent.click((await screen.findAllByRole('switch'))[0]);

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        type: CustomFieldTypes.TOGGLE,
        key: 'test_key_2',
        value: true,
      });
    });
  });

  it('updates existing text field correctly', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={customFieldsMock}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    userEvent.click(
      await screen.findByTestId(`case-text-custom-field-edit-button-${customFieldsMock[0].key}`)
    );

    userEvent.paste(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1'),
      '!!!'
    );

    userEvent.click(await screen.findByTestId('case-text-custom-field-submit-button-test_key_1'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customFieldsMock[0],
        value: 'My text test value 1!!!',
      });
    });
  });

  it('updates new text field correctly', async () => {
    appMockRender.render(
      <CustomFields
        isLoading={false}
        customFields={[]}
        customFieldsConfiguration={customFieldsConfigurationMock}
        onSubmit={onSubmit}
      />
    );

    userEvent.click(
      await screen.findByTestId(`case-text-custom-field-edit-button-${customFieldsMock[0].key}`)
    );

    expect(
      await screen.findByText('This field is populated with the default value.')
    ).toBeInTheDocument();

    userEvent.paste(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1'),
      ' updated!!'
    );

    userEvent.click(await screen.findByTestId('case-text-custom-field-submit-button-test_key_1'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customFieldsMock[0],
        value: `${customFieldsConfigurationMock[0].defaultValue} updated!!`,
      });
    });
  });
});
