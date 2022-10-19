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
import { TINES_CONNECTOR_ID } from '../../../../common/connector_types/security/tines/constants';

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
  params: { per_page: 20 },
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
  params: { story_id: story.id, per_page: 20 },
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
    beforeEach(() => {
      mockRequest.mockReturnValue({ data: { stories: [story], meta: {} } });
    });

    it('should request Tines stories', async () => {
      await connector.getStories();
      expect(mockRequest).toBeCalledTimes(1);
      const [[requestArgs]] = mockRequest.mock.calls;

      expect(requestArgs).toEqual(storiesGetRequestExpected);
    });

    it('should request the Tines stories with pagination', async () => {
      const secondPageUrl = `${url}/api/v1/stories?page=2&per_page=20`;
      mockRequest.mockReturnValueOnce({
        data: { stories: [story], meta: { next_page: secondPageUrl } },
      });
      await connector.getStories();

      expect(mockRequest).toBeCalledTimes(2);

      const [[request1Args], [request2Args]] = mockRequest.mock.calls;

      expect(request1Args).toEqual(storiesGetRequestExpected);

      expect(request2Args).toEqual({
        ...storiesGetRequestExpected,
        url: secondPageUrl,
        params: {},
      });
    });

    it('should request the Tines stories with pagination hard limit', async () => {
      mockRequest.mockReturnValue({
        data: { stories: [story], meta: { next_page: url } },
      });
      await connector.getStories();
      expect(mockRequest).toBeCalledTimes(100); // hard limit is 100 pages
    });

    it('should accumulate the Tines stories paged in a cleaned objects array', async () => {
      const story1 = { id: '1', name: 'story1' };
      const story2 = { id: '2', name: 'story2' };
      mockRequest
        .mockReturnValueOnce({
          data: { stories: [{ ...story1, description: 'desc1' }], meta: { next_page: url } },
        })
        .mockReturnValueOnce({
          data: { stories: [{ ...story2, description: 'desc2' }], meta: { next_page: null } },
        });
      const stories = await connector.getStories();

      expect(stories).toEqual([story1, story2]);
    });
  });

  describe('getWebhooks', () => {
    beforeEach(() => {
      mockRequest.mockReturnValue({ data: { agents: [webhookAgent], meta: {} } });
    });

    it('should request Tines webhook actions', async () => {
      await connector.getWebhooks({ storyId: story.id });

      expect(mockRequest).toBeCalledTimes(1);
      const [[requestArgs]] = mockRequest.mock.calls;

      expect(requestArgs).toEqual(agentsGetRequestExpected);
    });

    it('should request the Tines webhook actions with pagination', async () => {
      const secondPageUrl = `${url}/api/v1/agents?page=2&per_page=20`;
      mockRequest.mockReturnValueOnce({
        data: { agents: [webhookAgent], meta: { next_page: secondPageUrl } },
      });
      await connector.getWebhooks({ storyId: story.id });

      expect(mockRequest).toBeCalledTimes(2);

      const [[request1Args], [request2Args]] = mockRequest.mock.calls;

      expect(request1Args).toEqual(agentsGetRequestExpected);

      expect(request2Args).toEqual({
        ...agentsGetRequestExpected,
        url: secondPageUrl,
        params: {},
      });
    });

    it('should request the Tines webhook actions with pagination hard limit', async () => {
      mockRequest.mockReturnValue({
        data: { agents: [webhookAgent], meta: { next_page: url } },
      });
      await connector.getWebhooks({ storyId: story.id });
      expect(mockRequest).toBeCalledTimes(100); // hard limit is 100 pages
    });

    it('should request Tines webhook actions and take only webhook actions', async () => {
      mockRequest.mockReturnValue({ data: { agents: [otherAgent, webhookAgent], meta: {} } });
      const webhooks = await connector.getWebhooks({ storyId: story.id });

      expect(webhooks).toEqual([
        {
          id: webhookAgent.id,
          name: webhookAgent.name,
          path: webhookAgent.options.path,
          secret: webhookAgent.options.secret,
          storyId: webhookAgent.story_id,
        },
      ]);
    });

    it('should accumulate the Tines webhook actions paged in a filtered and cleaned objects array', async () => {
      const webhookAgent2 = { ...webhookAgent, id: 2, name: 'Elastic webhook 2' };
      mockRequest
        .mockReturnValueOnce({
          data: {
            agents: [{ ...webhookAgent, description: 'desc1' }, otherAgent],
            meta: { next_page: url },
          },
        })
        .mockReturnValueOnce({
          data: {
            agents: [{ ...webhookAgent2, description: 'desc2' }, otherAgent],
            meta: { next_page: null },
          },
        });

      const webhooks = await connector.getWebhooks({ storyId: story.id });

      expect(webhooks).toEqual([
        {
          id: webhookAgent.id,
          name: webhookAgent.name,
          path: webhookAgent.options.path,
          secret: webhookAgent.options.secret,
          storyId: webhookAgent.story_id,
        },
        {
          id: webhookAgent2.id,
          name: webhookAgent2.name,
          path: webhookAgent2.options.path,
          secret: webhookAgent2.options.secret,
          storyId: webhookAgent2.story_id,
        },
      ]);
    });
  });

  describe('runWebhook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRequest.mockReturnValue({ data: { took: 5, requestId: '123', status: 'ok' } });
    });

    it('should send data to Tines webhook', async () => {
      await connector.runWebhook({
        webhook: {
          id: webhookAgent.id,
          name: webhookAgent.name,
          path: webhookAgent.options.path,
          secret: webhookAgent.options.secret,
          storyId: webhookAgent.story_id,
        },
        body: '[]',
      });

      expect(mockRequest).toBeCalledTimes(1);
      const [[requestArgs]] = mockRequest.mock.calls;

      expect(requestArgs).toEqual({
        ...ignoredRequestFields,
        method: 'post',
        data: '[]',
        url: `${url}/webhook/${webhookAgent.options.path}/${webhookAgent.options.secret}`,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });
});
