/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, RenderResult } from '@testing-library/react';
import { FormTestProvider } from './builtin_action_types/test_utils';
import {
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from './simple_connector_form';
import userEvent from '@testing-library/user-event';

const fillForm = async ({ getByTestId }: RenderResult) => {
  await act(async () => {
    await userEvent.type(getByTestId('config.url-input'), 'https://example.com', {
      delay: 10,
    });
  });

  await act(async () => {
    await userEvent.type(getByTestId('config.test-config-input'), 'My text field', {
      delay: 10,
    });
  });

  await act(async () => {
    await userEvent.type(getByTestId('secrets.username-input'), 'elastic', {
      delay: 10,
    });
  });

  await act(async () => {
    await userEvent.type(getByTestId('secrets.password-input'), 'changeme', {
      delay: 10,
    });
  });
};

describe('SimpleConnectorForm', () => {
  const configFormSchema: ConfigFieldSchema[] = [
    { id: 'url', label: 'Url', isUrlField: true },
    { id: 'test-config', label: 'Test config', helpText: 'Test help text' },
  ];
  const secretsFormSchema: SecretsFieldSchema[] = [
    { id: 'username', label: 'Username' },
    { id: 'password', label: 'Password', isPasswordField: true },
  ];

  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = render(
      <FormTestProvider onSubmit={onSubmit}>
        <SimpleConnectorForm
          isEdit={true}
          readOnly={false}
          configFormSchema={configFormSchema}
          secretsFormSchema={secretsFormSchema}
        />
      </FormTestProvider>
    );

    expect(getByText('Url')).toBeInTheDocument();
    expect(getByText('Test config')).toBeInTheDocument();
    expect(getByText('Test help text')).toBeInTheDocument();

    expect(getByText('Authentication')).toBeInTheDocument();
    expect(getByText('Username')).toBeInTheDocument();
    expect(getByText('Password')).toBeInTheDocument();
  });

  it('submits correctly', async () => {
    const res = render(
      <FormTestProvider onSubmit={onSubmit}>
        <SimpleConnectorForm
          isEdit={true}
          readOnly={false}
          configFormSchema={configFormSchema}
          secretsFormSchema={secretsFormSchema}
        />
      </FormTestProvider>
    );

    await fillForm(res);

    await act(async () => {
      userEvent.click(res.getByTestId('form-test-provide-submit'));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      data: {
        config: {
          'test-config': 'My text field',
          url: 'https://example.com',
        },
        secrets: {
          password: 'changeme',
          username: 'elastic',
        },
      },
      isValid: true,
    });
  });

  describe('Validation', () => {
    const tests: Array<[string, string]> = [
      ['config.url-input', 'not-valid'],
      ['config.test-config-input', ''],
      ['secrets.username-input', ''],
      ['secrets.password-input', ''],
    ];

    it.each(tests)('validates correctly %p', async (field, value) => {
      const res = render(
        <FormTestProvider onSubmit={onSubmit}>
          <SimpleConnectorForm
            isEdit={true}
            readOnly={false}
            configFormSchema={configFormSchema}
            secretsFormSchema={secretsFormSchema}
          />
        </FormTestProvider>
      );

      await fillForm(res);

      await act(async () => {
        await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`, {
          delay: 10,
        });
      });

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
