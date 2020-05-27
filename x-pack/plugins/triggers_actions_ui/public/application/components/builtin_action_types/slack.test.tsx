/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { TypeRegistry } from '../../type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionParamsProps } from '../../../types';
import { SlackActionParams, SlackActionConnector } from './types';

const ACTION_TYPE_ID = '.slack';
let actionTypeModel: ActionTypeModel;

let deps: any;

beforeAll(async () => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
  deps = {
    docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
  };
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('logoSlack');
  });
});

describe('slack connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        webhookUrl: ['Webhook URL is required.'],
      },
    });
  });
});

describe('slack action params validation', () => {
  test('if action params validation succeeds when action params is valid', () => {
    const actionParams = {
      message: 'message {test}',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { message: [] },
    });
  });
});

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
    const ConnectorFields = actionTypeModel.actionConnectorFields;
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <ConnectorFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
  });
});

describe('SlackParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields as FunctionComponent<
      ActionParamsProps<SlackActionParams>
    >;
    const actionParams = {
      message: 'test message',
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="slackMessageTextArea"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="slackMessageTextArea"]').first().prop('value')
    ).toStrictEqual('test message');
  });

  test('params validation fails when message is not valid', () => {
    const actionParams = {
      message: '',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        message: ['Message is required.'],
      },
    });
  });
});
