/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { httpServiceMock, type HttpSetupMock } from '@kbn/core-http-browser-mocks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { createConversations } from './provider';
import { coreMock } from '@kbn/core/public/mocks';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';

jest.mock('./use_assistant_availability');

jest.mock('@kbn/elastic-assistant/impl/assistant/api');
jest.mock('../common/hooks/use_license', () => ({
  useLicense: () => ({
    isEnterprise: () => true,
  }),
  licenseService: {
    isEnterprise: () => true,
  },
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants');
let http: HttpSetupMock = coreMock.createSetup().http;
export const mockConnectors = [
  {
    id: 'my-gen-ai',
    name: 'Captain Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    config: {
      apiProvider: 'OpenAI',
    },
  },
  {
    id: 'my-bedrock',
    name: 'Professor Connector',
    isMissingSecrets: false,
    actionTypeId: '.bedrock',
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
  },
];
const conversations = {
  'Alert summary': {
    id: 'Alert summary',
    isDefault: true,
    apiConfig: {
      connectorId: 'my-bedrock',
      defaultSystemPromptId: 'default-system-prompt',
    },
    replacements: {
      '2a39da36-f5f4-4265-90ff-a0b2df2eb932': '192.168.0.4',
      'c960d0e7-96b4-4b7a-b287-65f33fc7a812': '142.250.72.78',
      '76d4a1d1-dbc3-4427-927e-b31b36856dc2': 'Test-MacBook-Pro.local',
      '7bb8a91c-fcbb-4430-9742-cfaad2917d37':
        '9d628163346d084eb8b3926cbf10cdee034b48e0cf83f0edf6921bc0dc83f0dd',
    },
    messages: [
      {
        content:
          'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\nCONTEXT:\n"""\n@timestamp,2024-01-23T19:15:59.194Z\n_id,7bb8a91c-fcbb-4430-9742-cfaad2917d37\ndestination.ip,c960d0e7-96b4-4b7a-b287-65f33fc7a812\nevent.action,network_flow\nevent.category,network\nevent.dataset,flow\nevent.type,connection\nhost.name,76d4a1d1-dbc3-4427-927e-b31b36856dc2\nkibana.alert.last_detected,2024-01-23T19:15:59.230Z\nkibana.alert.risk_score,21\nkibana.alert.rule.description,a\nkibana.alert.rule.name,a\nkibana.alert.severity,low\nkibana.alert.workflow_status,open\nsource.ip,2a39da36-f5f4-4265-90ff-a0b2df2eb932\n"""\n\nEvaluate the event from the context above and format your output neatly in markdown syntax for my Elastic Security case.\nAdd your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE\'s website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.',
        role: 'user',
        timestamp: '1/23/2024, 12:23:44 PM',
      },
      {
        role: 'assistant',
        reader: {},
        timestamp: '1/23/2024, 3:29:46 PM',
        isError: false,
        content: '',
      },
    ],
  },
  'Data Quality dashboard': {
    id: 'Data Quality dashboard',
    isDefault: true,
    apiConfig: {
      connectorId: 'my-gen-ai',
      defaultSystemPromptId: 'default-system-prompt',
    },
    messages: [
      {
        content:
          'You are a helpful, expert assistant who answers questions about Elastic Security. ',
        role: 'user',
        timestamp: '18/03/2024, 12:05:03',
      },
      {
        role: 'assistant',
        reader: {},
        timestamp: '19/03/2024, 12:05:03',
        isError: false,
        content:
          'Sure, here is an example of a KQL (Kibana Query Language) query that finds records where the `event.action` field contains the word "failure":\n\n```js\nevent.action: "failure"\n```\n\nIn Kibana, there are a variety of operators and techniques you can use to further enhance your search. For instance, you can combine multiple search terms or use wildcards.\n\nHere is an advanced example showing a combined search:\n\n```js\n(event.action: "failure") AND (user.name: "testuser")\n```\nThis will return only the events where `event.action` is "failure" and `user.name` is "testuser".\n\nFor more detailed information, you can check the official [Elasticsearch KQL documentation](https://www.elastic.co/guide/en/kibana/current/kuery-query.html)',
      },
    ],
  },
  'Detection Rules': {
    id: 'Detection Rules',
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  'Event summary': {
    id: 'Event summary',
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  Timeline: {
    excludeFromLastConversationStorage: true,
    id: 'Timeline',
    isDefault: true,
    messages: [],
    apiConfig: {},
  },
  Welcome: {
    id: 'Welcome',
    isDefault: true,
    theme: {
      title: 'Elastic AI Assistant',
      titleIcon: 'logoSecurity',
      assistant: {
        name: 'Elastic AI Assistant',
        icon: 'logoSecurity',
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    apiConfig: {
      connectorId: 'my-gen-ai',
      defaultSystemPromptId: 'default-system-prompt',
    },
    messages: [],
  },
};
const getItemStorageMock = jest.fn().mockReturnValue(conversations);
const mockStorage = {
  store: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
  get: getItemStorageMock,
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

describe('createConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    (loadConnectors as jest.Mock).mockResolvedValue(mockConnectors);
  });

  it('should call bulk conversations with the transformed conversations from the local storage', async () => {
    renderHook(() =>
      createConversations(
        coreMock.createStart().notifications,
        http,
        mockStorage as unknown as Storage
      )
    );
    await waitFor(() => null);
    expect(http.fetch.mock.calls[0][0]).toBe(
      '/internal/elastic_assistant/current_user/conversations/_bulk_action'
    );
    expect(
      http.fetch.mock.calls[0].length > 1
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          JSON.parse((http.fetch.mock.calls[0] as any[])[1]?.body).create.length
        : 0
    ).toBe(2);
  });

  it('should add missing actionTypeId to apiConfig', async () => {
    renderHook(() =>
      createConversations(
        coreMock.createStart().notifications,
        http,
        mockStorage as unknown as Storage
      )
    );
    await waitFor(() => null);
    expect(http.fetch.mock.calls[0][0]).toBe(
      '/internal/elastic_assistant/current_user/conversations/_bulk_action'
    );
    const createdConversations =
      http.fetch.mock.calls[0].length > 1
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          JSON.parse((http.fetch.mock.calls[0] as any[])[1]?.body)?.create
        : [];
    expect(createdConversations[0].apiConfig.actionTypeId).toEqual('.bedrock');
    expect(createdConversations[1].apiConfig.actionTypeId).toEqual('.gen-ai');
  });
});
