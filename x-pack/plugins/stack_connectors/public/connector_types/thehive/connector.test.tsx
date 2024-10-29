/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import TheHiveConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('TheHiveActionConnectorFields renders', () => {
  const actionConnector = {
    actionTypeId: '.thehive',
    name: 'thehive',
    config: {
      url: 'https://test.com',
    },
    secrets: {
      apiKey: 'apiKey',
    },
    isDeprecated: false,
  };

  it('TheHive connector fields are rendered', () => {
    const { getByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TheHiveConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(getByTestId('config.url-input')).toBeInTheDocument();
    expect(getByTestId('secrets.apiKey-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['config.url-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TheHiveConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.thehive',
            name: 'thehive',
            config: {
              url: 'https://test.com',
            },
            secrets: {
              apiKey: 'apiKey',
            },
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TheHiveConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(res.getByTestId(field));
      if (value !== '') {
        await userEvent.type(res.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
