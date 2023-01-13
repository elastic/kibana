/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import OpsgenieConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const actionConnector = {
  actionTypeId: '.opsgenie',
  name: 'opsgenie',
  config: {
    apiUrl: 'https://test.com',
  },
  secrets: {
    apiKey: 'secret',
  },
  isDeprecated: false,
};

describe('OpsgenieConnectorFields renders', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the fields', async () => {
    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <OpsgenieConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.apiUrl-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.apiKey-input')).toBeInTheDocument();
  });

  it('populates the url field with the default opsgenie url if none is set', async () => {
    const connector = {
      actionTypeId: '.opsgenie',
      name: 'opsgenie',
      config: {},
      secrets: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
        <OpsgenieConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.apiUrl-input')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.opsgenie.com')).toBeInTheDocument();
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['config.apiUrl-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <OpsgenieConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.opsgenie',
            name: 'opsgenie',
            config: {
              apiUrl: 'https://test.com',
            },
            secrets: {
              apiKey: 'secret',
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
          <OpsgenieConnectorFields
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

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
