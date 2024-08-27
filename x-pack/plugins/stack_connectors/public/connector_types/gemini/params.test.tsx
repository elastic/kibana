/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import GeminiParamsFields from './params';
import { DEFAULT_GEMINI_URL, SUB_ACTION } from '../../../common/gemini/constants';
import { I18nProvider } from '@kbn/i18n-react';

const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];

describe('Gemini Params Fields renders', () => {
  test('all params fields are rendered', () => {
    const { getByTestId } = render(
      <GeminiParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: { body: '{"message": "test"}' },
        }}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={messageVariables}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '{"message": "test"}');
    expect(getByTestId('bodyAddVariableButton')).toBeInTheDocument();
    expect(getByTestId('gemini-model')).toBeInTheDocument();
  });
  test('useEffect handles the case when subAction and subActionParams are undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: undefined,
    };
    const editAction = jest.fn();
    const errors = {};
    const actionConnector = {
      secrets: {
        credentialsJSON: JSON.stringify({
          type: 'service_account',
          project_id: '',
          private_key_id: '',
          private_key: '-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n',
          client_email: '',
          client_id: '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: '',
        }),
      },
      id: 'test',
      actionTypeId: '.gemini',
      isPreconfigured: false,
      isSystemAction: false as const,
      isDeprecated: false,
      name: 'My Gemini Connector',
      config: {
        apiUrl: DEFAULT_GEMINI_URL,
        gcpRegion: 'us-central-1',
        gcpProjectID: 'test-project',
      },
    };
    render(
      <GeminiParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(2);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('handles the case when subAction only is undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: {
        body: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};
    render(
      <GeminiParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('calls editAction function with the body argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <GeminiParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"}' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });

  it('removes trailing spaces from the body argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <GeminiParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"} ' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });

  it('calls editAction function with the model argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <GeminiParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const model = getByTestId('gemini-model');
    fireEvent.change(model, { target: { value: 'not-the-default' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"key": "value"}', model: 'not-the-default' },
      0
    );
  });
});
