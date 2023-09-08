/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import XmattersActionConnectorFields from './xmatters_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { render } from '@testing-library/react';

describe('XmattersActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="config.configUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only basic auth info when basic selected', () => {
    const actionConnector = {
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="config.configUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only url auth info when url selected', () => {
    const actionConnector = {
      secrets: {
        secretsUrl: 'https://test.com',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        usesBasic: false,
      },
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="secrets.secretsUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length === 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length === 0).toBeTruthy();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const basicAuthConnector = {
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const urlAuthConnector = {
      ...basicAuthConnector,
      config: {
        usesBasic: false,
      },
      secrets: {
        secretsUrl: 'https://test.com',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const basicAuthTests: Array<[string, string]> = [
      ['config.configUrl', 'not-valid'],
      ['xmattersUserInput', ''],
      ['xmattersPasswordInput', ''],
    ];

    const urlAuthTests: Array<[string, string]> = [['secrets.secretsUrl', 'not-valid']];

    it('connector validation succeeds when connector config is valid and uses basic auth', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.xmatters',
          name: 'xmatters',
          config: {
            configUrl: 'https://test.com',
            usesBasic: true,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            auth: 'Basic Authentication',
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('connector validation succeeds when connector config is valid and uses url auth', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={urlAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.xmatters',
          name: 'xmatters',
          config: {
            usesBasic: false,
          },
          secrets: {
            secretsUrl: 'https://test.com',
          },
          __internal__: { auth: 'URL Authentication' },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it.each(basicAuthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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

    it.each(urlAuthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={urlAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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
