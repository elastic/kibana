/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { CasesWebhookActionConnector } from './types';
import { registrationServicesMock } from '../../../../mocks';

const ACTION_TYPE_ID = '.cases-webhook';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry, services: registrationServicesMock });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('indexManagementApp');
  });
});

describe('webhook connector validation', () => {
  test('connector validation succeeds when hasAuth is true and connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.cases-webhook',
      name: 'Jira Webhook',
      isDeprecated: false,
      isPreconfigured: false,
      config: {
        createCommentJson: '{"body":"$COMMENT"}',
        createCommentMethod: 'post',
        createCommentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID/comment',
        createIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        createIncidentMethod: 'post',
        createIncidentResponseKey: 'id',
        createIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
        getIncidentResponseCreatedDateKey: 'fields.created',
        getIncidentResponseExternalTitleKey: 'key',
        getIncidentResponseUpdatedDateKey: 'fields.udpated',
        hasAuth: true,
        headers: { 'content-type': 'text' },
        incidentViewUrl: 'https://siem-kibana.atlassian.net/browse/$TITLE',
        getIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
        updateIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        updateIncidentMethod: 'put',
        updateIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
      },
    } as CasesWebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          createCommentJson: [],
          createCommentMethod: [],
          createCommentUrl: [],
          createIncidentJson: [],
          createIncidentMethod: [],
          createIncidentResponseKey: [],
          createIncidentUrl: [],
          getIncidentResponseCreatedDateKey: [],
          getIncidentResponseExternalTitleKey: [],
          getIncidentResponseUpdatedDateKey: [],
          incidentViewUrl: [],
          getIncidentUrl: [],
          updateIncidentJson: [],
          updateIncidentMethod: [],
          updateIncidentUrl: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
        },
      },
    });
  });

  test('connector validation succeeds when hasAuth is false and connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        user: '',
        password: '',
      },
      id: 'test',
      actionTypeId: '.cases-webhook',
      name: 'Jira Webhook',
      isDeprecated: false,
      isPreconfigured: false,
      config: {
        createCommentJson: '{"body":"$COMMENT"}',
        createCommentMethod: 'post',
        createCommentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID/comment',
        createIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        createIncidentMethod: 'post',
        createIncidentResponseKey: 'id',
        createIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
        getIncidentResponseCreatedDateKey: 'fields.created',
        getIncidentResponseExternalTitleKey: 'key',
        getIncidentResponseUpdatedDateKey: 'fields.udpated',
        hasAuth: false,
        headers: { 'content-type': 'text' },
        incidentViewUrl: 'https://siem-kibana.atlassian.net/browse/$TITLE',
        getIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
        updateIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        updateIncidentMethod: 'put',
        updateIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
      },
    } as CasesWebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          createCommentJson: [],
          createCommentMethod: [],
          createCommentUrl: [],
          createIncidentJson: [],
          createIncidentMethod: [],
          createIncidentResponseKey: [],
          createIncidentUrl: [],
          getIncidentResponseCreatedDateKey: [],
          getIncidentResponseExternalTitleKey: [],
          getIncidentResponseUpdatedDateKey: [],
          incidentViewUrl: [],
          getIncidentUrl: [],
          updateIncidentJson: [],
          updateIncidentMethod: [],
          updateIncidentUrl: [],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
        },
      },
    });
  });

  test('connector validation fails when connector config is not valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: '',
      },
      id: 'test',
      actionTypeId: '.cases-webhook',
      name: 'Jira Webhook',
      isDeprecated: false,
      isPreconfigured: false,
      config: {
        createCommentJson: '{"body":"$COMMENT"}',
        createCommentMethod: 'post',
        createIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        createIncidentMethod: 'post',
        createIncidentResponseKey: 'id',
        getIncidentResponseCreatedDateKey: 'fields.created',
        getIncidentResponseExternalTitleKey: 'key',
        getIncidentResponseUpdatedDateKey: 'fields.udpated',
        hasAuth: true,
        headers: { 'content-type': 'text' },
        updateIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        updateIncidentMethod: 'put',
      },
    } as unknown as CasesWebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          createCommentJson: [],
          createCommentMethod: [],
          createCommentUrl: ['Create comment URL is required.'],
          createIncidentJson: [],
          createIncidentMethod: [],
          createIncidentResponseKey: [],
          createIncidentUrl: ['Create incident URL is required.'],
          getIncidentResponseCreatedDateKey: [],
          getIncidentResponseExternalTitleKey: [],
          getIncidentResponseUpdatedDateKey: [],
          incidentViewUrl: ['View incident URL is required.'],
          getIncidentUrl: ['Get incident URL is required.'],
          updateIncidentJson: [],
          updateIncidentMethod: [],
          updateIncidentUrl: ['Update incident URL is required.'],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: ['Password is required when username is used.'],
        },
      },
    });
  });

  test('connector validation fails when url in config is not valid', async () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.cases-webhook',
      name: 'Jira Webhook',
      isDeprecated: false,
      isPreconfigured: false,
      config: {
        createCommentJson: '{"body":"$COMMENT"}',
        createCommentMethod: 'post',
        createCommentUrl: 'invalid.url',
        createIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        createIncidentMethod: 'post',
        createIncidentResponseKey: 'id',
        createIncidentUrl: 'invalid.url',
        getIncidentResponseCreatedDateKey: 'fields.created',
        getIncidentResponseExternalTitleKey: 'key',
        getIncidentResponseUpdatedDateKey: 'fields.udpated',
        hasAuth: true,
        headers: { 'content-type': 'text' },
        incidentViewUrl: 'invalid.url',
        getIncidentUrl: 'invalid.url',
        updateIncidentJson:
          '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
        updateIncidentMethod: 'put',
        updateIncidentUrl: 'invalid.url',
      },
    } as CasesWebhookActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          createCommentJson: [],
          createCommentMethod: [],
          createCommentUrl: ['Create comment URL is invalid.'],
          createIncidentJson: [],
          createIncidentMethod: [],
          createIncidentResponseKey: [],
          createIncidentUrl: ['Create incident URL is invalid.'],
          getIncidentResponseCreatedDateKey: [],
          getIncidentResponseExternalTitleKey: [],
          getIncidentResponseUpdatedDateKey: [],
          incidentViewUrl: ['View incident URL is invalid.'],
          getIncidentUrl: ['Get incident URL is invalid.'],
          updateIncidentJson: [],
          updateIncidentMethod: [],
          updateIncidentUrl: ['Update incident URL is invalid.'],
        },
      },
      secrets: {
        errors: {
          user: [],
          password: [],
        },
      },
    });
  });
});

describe('webhook action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: 'some title {{test}}' }, comments: [] },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { 'subActionParams.incident.summary': [] },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: '' }, comments: [] },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': ['Summary is required.'],
      },
    });
  });
});
