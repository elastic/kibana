/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import CasesWebhookActionConnectorFields from './webhook_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as i18n from './translations';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        docLinks: { ELASTIC_WEBSITE_URL: 'url' },
      },
    }),
  };
});

const invalidJsonTitle = `{"fields":{"summary":"wrong","description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}`;
const invalidJsonBoth = `{"fields":{"summary":"wrong","description":"wrong","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}`;
const config = {
  createCommentJson: '{"body":{{{case.comment}}}}',
  createCommentMethod: 'post',
  createCommentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}/comment',
  createIncidentJson:
    '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  createIncidentMethod: 'post',
  createIncidentResponseKey: 'id',
  createIncidentUrl: 'https://coolsite.net/rest/api/2/issue',
  getIncidentResponseExternalTitleKey: 'key',
  hasAuth: true,
  headers: [{ key: 'content-type', value: 'text' }],
  viewIncidentUrl: 'https://coolsite.net/browse/{{{external.system.title}}}',
  getIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
  updateIncidentJson:
    '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  updateIncidentMethod: 'put',
  updateIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
};
const actionConnector = {
  secrets: {
    user: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.cases-webhook',
  isDeprecated: false,
  isPreconfigured: false,
  name: 'cases webhook',
  config,
};

describe('CasesWebhookActionConnectorFields renders', () => {
  test('All inputs are properly rendered', async () => {
    const { getByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <CasesWebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );
    await waitForComponentToUpdate();
    expect(getByTestId('webhookUserInput')).toBeInTheDocument();
    expect(getByTestId('webhookPasswordInput')).toBeInTheDocument();
    expect(getByTestId('webhookHeadersKeyInput')).toBeInTheDocument();
    expect(getByTestId('webhookHeadersValueInput')).toBeInTheDocument();
    expect(getByTestId('webhookCreateMethodSelect')).toBeInTheDocument();
    expect(getByTestId('webhookCreateUrlText')).toBeInTheDocument();
    expect(getByTestId('webhookCreateIncidentJson')).toBeInTheDocument();
    expect(getByTestId('createIncidentResponseKeyText')).toBeInTheDocument();
    expect(getByTestId('getIncidentUrlInput')).toBeInTheDocument();
    expect(getByTestId('getIncidentResponseExternalTitleKeyText')).toBeInTheDocument();
    expect(getByTestId('viewIncidentUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookUpdateMethodSelect')).toBeInTheDocument();
    expect(getByTestId('updateIncidentUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookUpdateIncidentJson')).toBeInTheDocument();
    expect(getByTestId('webhookCreateCommentMethodSelect')).toBeInTheDocument();
    expect(getByTestId('createCommentUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookCreateCommentJson')).toBeInTheDocument();
  });
  test('Toggles work properly', async () => {
    const { getByTestId, queryByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <CasesWebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );
    await waitForComponentToUpdate();
    expect(getByTestId('hasAuthToggle')).toHaveAttribute('aria-checked', 'true');
    await act(async () => {
      userEvent.click(getByTestId('hasAuthToggle'));
    });
    expect(getByTestId('hasAuthToggle')).toHaveAttribute('aria-checked', 'false');
    expect(queryByTestId('webhookUserInput')).not.toBeInTheDocument();
    expect(queryByTestId('webhookPasswordInput')).not.toBeInTheDocument();

    expect(getByTestId('webhookViewHeadersSwitch')).toHaveAttribute('aria-checked', 'true');
    await act(async () => {
      userEvent.click(getByTestId('webhookViewHeadersSwitch'));
    });
    expect(getByTestId('webhookViewHeadersSwitch')).toHaveAttribute('aria-checked', 'false');
    expect(queryByTestId('webhookHeadersKeyInput')).not.toBeInTheDocument();
    expect(queryByTestId('webhookHeadersValueInput')).not.toBeInTheDocument();
  });
  describe('Step Validation', () => {
    test('Steps work correctly when all fields valid', async () => {
      const { queryByTestId, getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await waitForComponentToUpdate();
      expect(getByTestId('horizontalStep1-current')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-incomplete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-incomplete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-incomplete')).toBeInTheDocument();
      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: block;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: none;');
      expect(queryByTestId('casesWebhookBack')).not.toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep1-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-current')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-incomplete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-incomplete')).toBeInTheDocument();
      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: block;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: none;');
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep1-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-current')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-incomplete')).toBeInTheDocument();
      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: block;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: none;');
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep1-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-current')).toBeInTheDocument();
      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: block;');
      expect(queryByTestId('casesWebhookNext')).not.toBeInTheDocument();
    });
    test('Step 1 is properly validated', async () => {
      const incompleteActionConnector = {
        ...actionConnector,
        secrets: {
          user: '',
          password: '',
        },
      };
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={incompleteActionConnector}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await waitForComponentToUpdate();

      expect(getByTestId('horizontalStep1-current')).toBeInTheDocument();

      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      await waitForComponentToUpdate();

      expect(getByTestId('horizontalStep1-danger')).toBeInTheDocument();

      await act(async () => {
        userEvent.click(getByTestId('hasAuthToggle'));
        userEvent.click(getByTestId('webhookViewHeadersSwitch'));
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });

      expect(getByTestId('horizontalStep1-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-current')).toBeInTheDocument();
    });
    test('Step 2 is properly validated', async () => {
      const incompleteActionConnector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          createIncidentUrl: undefined,
        },
      };
      const { getByText, getByTestId } = render(
        <ConnectorFormTestProvider connector={incompleteActionConnector}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await waitForComponentToUpdate();
      expect(getByTestId('horizontalStep2-incomplete')).toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      getByText(i18n.CREATE_URL_REQUIRED);
      expect(getByTestId('horizontalStep2-danger')).toBeInTheDocument();
      await act(async () => {
        await userEvent.type(
          getByTestId('webhookCreateUrlText'),
          `{selectall}{backspace}${config.createIncidentUrl}`,
          {
            delay: 10,
          }
        );
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep2-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-current')).toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('horizontalStep2-complete'));
      });
      expect(getByTestId('horizontalStep2-current')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-incomplete')).toBeInTheDocument();
    });
    test('Step 3 is properly validated', async () => {
      const incompleteActionConnector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          getIncidentResponseExternalTitleKey: undefined,
        },
      };
      const { getByText, getByTestId } = render(
        <ConnectorFormTestProvider connector={incompleteActionConnector}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await waitForComponentToUpdate();
      expect(getByTestId('horizontalStep2-incomplete')).toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      getByText(i18n.GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED);
      expect(getByTestId('horizontalStep3-danger')).toBeInTheDocument();
      await act(async () => {
        await userEvent.type(
          getByTestId('getIncidentResponseExternalTitleKeyText'),
          `{selectall}{backspace}${config.getIncidentResponseExternalTitleKey}`,
          {
            delay: 10,
          }
        );
      });
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep3-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-current')).toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('horizontalStep3-complete'));
      });
      expect(getByTestId('horizontalStep3-current')).toBeInTheDocument();
      expect(getByTestId('horizontalStep4-incomplete')).toBeInTheDocument();
    });

    // step 4 is not validated like the others since it is the last step
    // this validation is tested in the main validation section
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['webhookCreateUrlText', 'not-valid'],
      ['webhookUserInput', ''],
      ['webhookPasswordInput', ''],
      ['viewIncidentUrlInput', 'https://missingexternalid.com'],
      ['createIncidentResponseKeyText', ''],
      ['getIncidentUrlInput', 'https://missingexternalid.com'],
      ['getIncidentResponseExternalTitleKeyText', ''],
      ['updateIncidentUrlInput', 'badurl.com'],
      ['createCommentUrlInput', 'badurl.com'],
    ];

    const mustacheTests: Array<[string, string, string[]]> = [
      ['createIncidentJson', invalidJsonTitle, ['{{{case.title}}}']],
      ['createIncidentJson', invalidJsonBoth, ['{{{case.title}}}', '{{{case.description}}}']],
      ['updateIncidentJson', invalidJsonTitle, ['{{{case.title}}}']],
      ['updateIncidentJson', invalidJsonBoth, ['{{{case.title}}}', '{{{case.description}}}']],
      ['createCommentJson', invalidJsonBoth, ['{{{case.comment}}}']],
      [
        'viewIncidentUrl',
        'https://missingexternalid.com',
        ['{{{external.system.id}}}', '{{{external.system.title}}}'],
      ],
      ['getIncidentUrl', 'https://missingexternalid.com', ['{{{external.system.id}}}']],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });
      const { isPreconfigured, ...rest } = actionConnector;

      expect(onSubmit).toBeCalledWith({
        data: {
          ...rest,
          __internal__: {
            hasHeaders: true,
          },
        },
        isValid: true,
      });
    });

    it('connector validation succeeds when auth=false', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          hasAuth: false,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      const { isPreconfigured, secrets, ...rest } = actionConnector;
      expect(onSubmit).toBeCalledWith({
        data: {
          ...rest,
          config: {
            ...actionConnector.config,
            hasAuth: false,
          },
          __internal__: {
            hasHeaders: true,
          },
        },
        isValid: true,
      });
    });

    it('connector validation succeeds without headers', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          headers: null,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      const { isPreconfigured, ...rest } = actionConnector;
      const { headers, ...rest2 } = actionConnector.config;
      expect(onSubmit).toBeCalledWith({
        data: {
          ...rest,
          config: rest2,
          __internal__: {
            hasHeaders: false,
          },
        },
        isValid: true,
      });
    });

    it('validates correctly if the method is empty', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          createIncidentMethod: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

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
          <CasesWebhookActionConnectorFields
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

    it.each(mustacheTests)(
      'validates mustache field correctly %p',
      async (field, value, missingVariables) => {
        const connector = {
          ...actionConnector,
          config: {
            ...actionConnector.config,
            [field]: value,
            headers: [],
          },
        };

        const res = render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <CasesWebhookActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await act(async () => {
          userEvent.click(res.getByTestId('form-test-provide-submit'));
        });

        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
        expect(res.getByText(i18n.MISSING_VARIABLES(missingVariables))).toBeInTheDocument();
      }
    );
  });
});
