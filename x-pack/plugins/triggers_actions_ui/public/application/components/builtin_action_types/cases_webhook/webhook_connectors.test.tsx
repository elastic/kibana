/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import CasesWebhookActionConnectorFields from './webhook_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../test_utils';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockCodeEditor } from '../../../code_editor.mock';
import * as i18n from './translations';
const kibanaReactPath = '../../../../../../../../src/plugins/kibana_react/public';

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

const invalidJson =
  '{"fields":{"summary":"wrong","description":"wrong","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}';
const config = {
  createCommentJson: '{"body":{{{case.comment}}}}',
  createCommentMethod: 'post',
  createCommentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID/comment',
  createIncidentJson:
    '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  createIncidentMethod: 'post',
  createIncidentResponseKey: 'id',
  createIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
  getIncidentResponseCreatedDateKey: 'fields.created',
  getIncidentResponseExternalTitleKey: 'key',
  getIncidentResponseUpdatedDateKey: 'fields.udpated',
  hasAuth: true,
  headers: [{ key: 'content-type', value: 'text' }],
  incidentViewUrl: 'https://siem-kibana.atlassian.net/browse/$TITLE',
  getIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
  updateIncidentJson:
    '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  updateIncidentMethod: 'put',
  updateIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
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

const completeStep1 = async (getByTestId: (id: string) => HTMLElement) => {
  await act(async () => {
    userEvent.click(getByTestId('hasAuthToggle'));
    userEvent.click(getByTestId('webhookViewHeadersSwitch'));
  });
  await act(async () => {
    userEvent.click(getByTestId('casesWebhookNext'));
  });
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
    expect(getByTestId('getIncidentResponseCreatedDateKeyText')).toBeInTheDocument();
    expect(getByTestId('getIncidentResponseUpdatedDateKeyText')).toBeInTheDocument();
    expect(getByTestId('incidentViewUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookUpdateMethodSelect')).toBeInTheDocument();
    expect(getByTestId('updateIncidentUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookUpdateIncidentJson')).toBeInTheDocument();
    expect(getByTestId('webhookCreateCommentMethodSelect')).toBeInTheDocument();
    expect(getByTestId('createCommentUrlInput')).toBeInTheDocument();
    expect(getByTestId('webhookCreateCommentJson')).toBeInTheDocument();
  });
  describe('Step 1 Validation', () => {
    test('Step 1 toggles work properly', async () => {
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
    test('Step 1 is properly validated', async () => {
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

      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: block;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('horizontalStep1-current')).toBeInTheDocument();

      await act(async () => {
        await userEvent.type(getByTestId('webhookUserInput'), `{selectall}{backspace}`);
        await userEvent.type(getByTestId('webhookPasswordInput'), `{selectall}{backspace}`);
        userEvent.click(getByTestId('casesWebhookNext'));
      });

      expect(getByTestId('horizontalStep1-danger')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-incomplete')).toBeInTheDocument();

      await completeStep1(getByTestId);

      expect(getByTestId('horizontalStep1-complete')).toBeInTheDocument();
      expect(getByTestId('horizontalStep2-current')).toBeInTheDocument();
    });
  });
  describe('Step 2 Validation', () => {
    test('Step 2 is properly validated when url field is missing', async () => {
      const incompleteActionConnector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          createIncidentUrl: '',
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
      await completeStep1(getByTestId);
      expect(getByTestId('authStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('createStep')).toHaveAttribute('style', 'display: block;');
      expect(getByTestId('getStep')).toHaveAttribute('style', 'display: none;');
      expect(getByTestId('updateStep')).toHaveAttribute('style', 'display: none;');
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      getByText(i18n.CREATE_URL_REQUIRED);
      expect(getByTestId('horizontalStep2-danger')).toBeInTheDocument();
      expect(getByTestId('horizontalStep3-incomplete')).toBeInTheDocument();
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
    test('Step 2 is properly validated when json is missing case variables', async () => {
      const incompleteActionConnector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          createIncidentJson: invalidJson,
        },
      };
      const { getByTestId, getByText } = render(
        <ConnectorFormTestProvider connector={incompleteActionConnector}>
          <CasesWebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await waitForComponentToUpdate();
      await completeStep1(getByTestId);
      expect(getByTestId('horizontalStep2-current')).toBeInTheDocument();
      await act(async () => {
        userEvent.click(getByTestId('casesWebhookNext'));
      });
      expect(getByTestId('horizontalStep2-danger')).toBeInTheDocument();
      expect(
        getByText(i18n.MISSING_VARIABLES(['{{{case.title}}}', '{{{case.description}}}']))
      ).toBeInTheDocument();
    });
  });

  describe.skip('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['webhookCreateUrlText', 'not-valid'],
      ['webhookUserInput', ''],
      ['webhookPasswordInput', ''],
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
  });
});
