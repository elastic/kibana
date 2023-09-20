/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import BedrockConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { DEFAULT_BEDROCK_MODEL } from '../../../common/bedrock/constants';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const bedrockConnector = {
  actionTypeId: '.bedrock',
  name: 'bedrock',
  id: '123',
  config: {
    apiUrl: 'https://bedrockurl.com',
    defaultModel: DEFAULT_BEDROCK_MODEL,
  },
  secrets: {
    accessKey: 'thats-a-nice-looking-key',
    secret: 'thats-a-nice-looking-secret',
  },
  isDeprecated: false,
};

const navigateToUrl = jest.fn();

describe('BedrockConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToUrl = navigateToUrl;
  });
  test('Bedrock connector fields are rendered', async () => {
    const { getAllByTestId } = render(
      <ConnectorFormTestProvider connector={bedrockConnector}>
        <BedrockConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getAllByTestId('config.apiUrl-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.apiUrl-input')[0]).toHaveValue(bedrockConnector.config.apiUrl);
    expect(getAllByTestId('config.defaultModel-input')[0]).toBeInTheDocument();
    expect(getAllByTestId('config.defaultModel-input')[0]).toHaveValue(
      bedrockConnector.config.defaultModel
    );
    expect(getAllByTestId('bedrock-api-doc')[0]).toBeInTheDocument();
    expect(getAllByTestId('bedrock-api-model-doc')[0]).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={bedrockConnector} onSubmit={onSubmit}>
          <BedrockConnectorFields
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
        data: bedrockConnector,
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const connector = {
        ...bedrockConnector,
        config: {
          ...bedrockConnector.config,
          apiUrl: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <BedrockConnectorFields
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
      ['secrets.accessKey-input', ''],
    ];
    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...bedrockConnector,
        config: {
          ...bedrockConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <BedrockConnectorFields
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
