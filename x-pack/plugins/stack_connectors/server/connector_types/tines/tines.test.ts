/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance } from 'axios';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TinesConnector } from './tines';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { API_MAX_RESULTS, TINES_CONNECTOR_ID } from '../../../common/tines/constants';

jest.mock('axios');
(axios as jest.Mocked<typeof axios>).create.mockImplementation(
  () => jest.fn() as unknown as AxiosInstance
);

jest.mock('@kbn/actions-plugin/server/lib/axios_utils');
const mockRequest = request as jest.Mock;

const url = 'https://example.com';
const email = 'some.email@test.com';
const token = '123';

const story = {
  id: 97469,
  name: 'Test story',
  published: true,
  team_id: 1234, // just to make sure it is cleaned
};
const storyResult = {
  id: story.id,
  name: story.name,
  published: story.published,
};

const otherAgent = {
  id: 941613,
  name: 'HTTP Req. Action',
  type: 'Agents::HTTPRequestAgent',
  story_id: 97469,
  options: {},
};
const webhookAgent = {
  ...otherAgent,
  name: 'Elastic Security Webhook',
  type: 'Agents::WebhookAgent',
  options: {
    path: '18f15eaaae93111d3187af42d236c8b2',
    secret: 'eb80106acb3ee1521985f5cec3dd224c',
  },
};
const webhookResult = {
  id: webhookAgent.id,
  name: webhookAgent.name,
  storyId: webhookAgent.story_id,
  path: webhookAgent.options.path,
  secret: webhookAgent.options.secret,
};
const webhookUrl = `${url}/webhook/${webhookAgent.options.path}/${webhookAgent.options.secret}`;

const ignoredRequestFields = {
  axios: expect.anything(),
  configurationUtilities: expect.anything(),
  logger: expect.anything(),
};
const storiesGetRequestExpected = {
  ...ignoredRequestFields,
  method: 'get',
  data: {},
  url: `${url}/api/v1/stories`,
  headers: {
    'x-user-email': email,
    'x-user-token': token,
    'Content-Type': 'application/json',
  },
  params: { per_page: API_MAX_RESULTS },
};

const agentsGetRequestExpected = {
  ...ignoredRequestFields,
  method: 'get',
  data: {},
  url: `${url}/api/v1/agents`,
  headers: {
    'x-user-email': email,
    'x-user-token': token,
    'Content-Type': 'application/json',
  },
  params: { story_id: story.id, per_page: API_MAX_RESULTS },
};

describe('TinesConnector', () => {
  const connector = new TinesConnector({
    configurationUtilities: actionsConfigMock.create(),
    config: { url },
    connector: { id: '1', type: TINES_CONNECTOR_ID },
    secrets: { email, token },
    logger: loggingSystemMock.createLogger(),
    services: actionsMock.createServices(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStories', () => {
    beforeAll(() => {
      mockRequest.mockReturnValue({ data: { stories: [story], meta: { pages: 1 } } });
    });

    it('should request Tines stories', async () => {
      await connector.getStories();
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(storiesGetRequestExpected);
    });

    it('should return the Tines stories reduced array', async () => {
      const { stories } = await connector.getStories();
      expect(stories).toEqual([storyResult]);
    });

    it('should request the Tines stories complete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { stories: [story], meta: { pages: 1 } },
      });
      const response = await connector.getStories();
      expect(response.incompleteResponse).toEqual(false);
    });

    it('should request the Tines stories incomplete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { stories: [story], meta: { pages: 2 } },
      });
      const response = await connector.getStories();
      expect(response.incompleteResponse).toEqual(true);
    });
  });

  describe('getWebhooks', () => {
    beforeAll(() => {
      mockRequest.mockReturnValue({ data: { agents: [webhookAgent], meta: { pages: 1 } } });
    });

    it('should request Tines webhook actions', async () => {
      await connector.getWebhooks({ storyId: story.id });

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(agentsGetRequestExpected);
    });

    it('should return the Tines webhooks reduced array', async () => {
      const { webhooks } = await connector.getWebhooks({ storyId: story.id });
      expect(webhooks).toEqual([webhookResult]);
    });

    it('should request the Tines webhook complete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { agents: [webhookAgent], meta: { pages: 1 } },
      });
      const response = await connector.getWebhooks({ storyId: story.id });
      expect(response.incompleteResponse).toEqual(false);
    });

    it('should request the Tines webhook incomplete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { agents: [webhookAgent], meta: { pages: 2 } },
      });
      const response = await connector.getWebhooks({ storyId: story.id });
      expect(response.incompleteResponse).toEqual(true);
    });
  });

  describe('runWebhook', () => {
    beforeAll(() => {
      mockRequest.mockReturnValue({ data: { took: 5, requestId: '123', status: 'ok' } });
    });

    it('should send data to Tines webhook using selected webhook parameter', async () => {
      await connector.runWebhook({
        webhook: webhookResult,
        body: '[]',
      });

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'post',
        data: '[]',
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should send data to Tines webhook using webhook url parameter', async () => {
      await connector.runWebhook({
        webhookUrl,
        body: '[]',
      });

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'post',
        data: '[]',
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });
});
