/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import GenerativeAiConnectorFields from './connector';
import { ConnectorFormTestProvider } from '@kbn/stack-connectors-plugin/public/connector_types/lib/test_utils';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenAiProviderType } from '../../../common/gen_ai/constants';

describe('GenerativeAiConnectorFields renders', () => {
  test('open ai connector fields are rendered', async () => {
    const actionConnector = {
      actionTypeId: '.gen-ai',
      name: 'genAi',
      config: {
        apiUrl: 'https://openaiurl.com',
        apiProvider: OpenAiProviderType.OpenAi,
      },
      secrets: {
        apiKey: 'thats-a-nice-looking-key',
      },
      isDeprecated: false,
    };

    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <GenerativeAiConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );
    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(actionConnector.config.apiUrl);
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      actionConnector.config.apiProvider
    );
    expect(getAllByTestId('open-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('open-ai-api-keys-doc')[0]).toBeInTheDocument();
  });

  test('azure ai connector fields are rendered', async () => {
    const actionConnector = {
      actionTypeId: '.gen-ai',
      name: 'genAi',
      config: {
        apiUrl: 'https://azureaiurl.com',
        apiProvider: OpenAiProviderType.AzureAi,
      },
      secrets: {
        apiKey: 'thats-a-nice-looking-key',
      },
      isDeprecated: false,
    };

    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <GenerativeAiConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(actionConnector.config.apiUrl);
    expect(getAllByTestId('config.apiProvider-select')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiProvider-select')[0]).toHaveValue(
      actionConnector.config.apiProvider
    );
    expect(getAllByTestId('azure-ai-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('azure-ai-api-keys-doc')[0]).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const actionConnector = {
      actionTypeId: '.gen-ai',
      name: 'genAi',
      config: {
        apiUrl: 'https://openaiurl.com',
        apiProvider: OpenAiProviderType.OpenAi,
      },
      secrets: {
        apiKey: 'thats-a-nice-looking-key',
      },
      isDeprecated: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <GenerativeAiConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toBeCalledWith({
        data: actionConnector,
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          apiUrl: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <GenerativeAiConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    const tests: Array<[string, string]> = [
      ['config.apiUrl-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <GenerativeAiConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`, {
          delay: 10,
        });
      });

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });
      await waitFor(async () => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
