/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

import { createExternalService } from './service';
import { request, createAxiosResponse } from '@kbn/actions-plugin/server/lib/axios_utils';
import { CasesWebhookPublicConfigurationType, ExternalService } from './types';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server/lib';
import { AuthType, WebhookMethods, SSLCertType } from '../../../common/auth/constants';
import { CRT_FILE, KEY_FILE } from '../../../common/auth/mocks';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);

const requestMock = request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();

const config: CasesWebhookPublicConfigurationType = {
  createCommentJson: '{"body":{{{case.comment}}}}',
  createCommentMethod: WebhookMethods.POST,
  createCommentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}/comment',
  createIncidentJson:
    '{"fields":{"title":{{{case.title}}},"description":{{{case.description}}},"tags":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  createIncidentMethod: WebhookMethods.POST,
  createIncidentResponseKey: 'id',
  createIncidentUrl: 'https://coolsite.net/issue',
  getIncidentResponseExternalTitleKey: 'key',
  hasAuth: true,
  headers: { ['content-type']: 'application/json', foo: 'bar' },
  viewIncidentUrl: 'https://coolsite.net/browse/{{{external.system.title}}}',
  getIncidentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}',
  updateIncidentJson:
    '{"fields":{"title":{{{case.title}}},"description":{{{case.description}}},"tags":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  updateIncidentMethod: WebhookMethods.PUT,
  updateIncidentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}',
};
const secrets = {
  user: 'user',
  password: 'pass',
  crt: null,
  key: null,
  pfx: null,
};
const defaultSSLOverrides = {};
const actionId = '1234';
const mockTime = new Date('2021-10-20T19:41:02.754+0300');

const sslConfig: CasesWebhookPublicConfigurationType = {
  ...config,
  authType: AuthType.SSL,
  certType: SSLCertType.CRT,
  hasAuth: true,
};
const sslSecrets = { crt: CRT_FILE, key: KEY_FILE, password: 'foobar', user: null, pfx: null };

describe('Cases webhook service', () => {
  let service: ExternalService;
  let sslService: ExternalService;

  beforeAll(() => {
    service = createExternalService(
      actionId,
      {
        config,
        secrets,
      },
      logger,
      configurationUtilities
    );

    sslService = createExternalService(
      actionId,
      {
        config: sslConfig,
        secrets: sslSecrets,
      },
      logger,
      configurationUtilities
    );
    jest.useFakeTimers();
    jest.setSystemTime(mockTime);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    const requiredUrls = [
      'createIncidentUrl',
      'viewIncidentUrl',
      'getIncidentUrl',
      'updateIncidentUrl',
    ];
    test.each(requiredUrls)('throws without url %p', (url) => {
      expect(() =>
        createExternalService(
          actionId,
          {
            config: { ...config, [url]: '' },
            secrets,
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    it('throws if hasAuth and no user/pass', () => {
      expect(() =>
        createExternalService(
          actionId,
          {
            config,
            secrets: { ...secrets, user: '', password: '' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    it('does not throw if hasAuth=false and no user/pass', () => {
      expect(() =>
        createExternalService(
          actionId,
          {
            config: { ...config, hasAuth: false },
            secrets: { ...secrets, user: '', password: '' },
          },
          logger,
          configurationUtilities
        )
      ).not.toThrow();
    });

    it('uses the basic auth header for authentication', () => {
      createExternalService(
        actionId,
        {
          config,
          secrets: { ...secrets, user: 'username', password: 'password' },
        },
        logger,
        configurationUtilities
      );

      expect(axios.create).toHaveBeenCalledWith({
        headers: {
          ...getBasicAuthHeader({ username: 'username', password: 'password' }),
          'content-type': 'application/json',
          foo: 'bar',
        },
      });
    });

    it('does not add the basic auth header for authentication if hasAuth=false', () => {
      createExternalService(
        actionId,
        {
          config: { ...config, hasAuth: false },
          secrets: { ...secrets, user: 'username', password: 'password' },
        },
        logger,
        configurationUtilities
      );

      expect(axios.create).toHaveBeenCalledWith({
        headers: {
          'content-type': 'application/json',
          foo: 'bar',
        },
      });
    });
  });

  describe('getIncident', () => {
    const axiosRes = {
      data: {
        id: '1',
        key: 'CK-1',
        fields: {
          title: 'title',
          description: 'description',
        },
      },
    };

    it('it returns the incident correctly', async () => {
      requestMock.mockImplementation(() => createAxiosResponse(axiosRes));
      const res = await service.getIncident('1');
      expect(res).toEqual({
        id: '1',
        title: 'CK-1',
      });
    });

    it('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => createAxiosResponse(axiosRes));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://coolsite.net/issue/1',
        logger,
        configurationUtilities,
        sslOverrides: defaultSSLOverrides,
      });
    });

    it('it should call request with correct arguments when authType=SSL', async () => {
      requestMock.mockImplementation(() => createAxiosResponse(axiosRes));

      await sslService.getIncident('1');

      // irrelevant snapshot content
      delete requestMock.mock.calls[0][0].configurationUtilities;
      expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "axios": [Function],
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction],
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "sslOverrides": Object {
            "cert": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "key": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "passphrase": "foobar",
          },
          "url": "https://coolsite.net/issue/1",
        }
      `);
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });
      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    it('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ ...axiosRes, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id 1. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json'
      );
    });

    it('it should throw if the required attributes are not there', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { fields: { notRequired: 'test' } } })
      );

      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id 1. Error: Response is missing the expected field: key'
      );
    });
  });

  describe('createIncident', () => {
    const incident = {
      incident: {
        title: 'title',
        description: 'desc',
        tags: ['hello', 'world'],
        id: '10006',
        severity: 'High',
        status: 'Open',
      },
    };

    it('it creates the incident correctly', async () => {
      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: { id: '1', key: 'CK-1', fields: { title: 'title', description: 'description' } },
        })
      );

      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      const res = await service.createIncident(incident);

      expect(requestMock.mock.calls[0][0].data).toEqual(
        `{"fields":{"title":"title","description":"desc","tags":["hello","world"],"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}`
      );

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: mockTime.toISOString(),
        url: 'https://coolsite.net/browse/CK-1',
      });
    });

    it('it should call request with correct arguments', async () => {
      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await service.createIncident(incident);

      expect(requestMock.mock.calls[0][0]).toEqual({
        axios,
        url: 'https://coolsite.net/issue',
        logger,
        method: WebhookMethods.POST,
        configurationUtilities,
        sslOverrides: defaultSSLOverrides,
        data: `{"fields":{"title":"title","description":"desc","tags":["hello","world"],"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}`,
      });
    });

    it('it should call request with correct arguments when authType=SSL', async () => {
      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await sslService.createIncident(incident);

      // irrelevant snapshot content
      delete requestMock.mock.calls[0][0].configurationUtilities;
      expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "axios": [Function],
          "data": "{\\"fields\\":{\\"title\\":\\"title\\",\\"description\\":\\"desc\\",\\"tags\\":[\\"hello\\",\\"world\\"],\\"project\\":{\\"key\\":\\"ROC\\"},\\"issuetype\\":{\\"id\\":\\"10024\\"}}}",
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction] {
              "calls": Array [
                Array [
                  "response from webhook action \\"1234\\": [HTTP 200] OK",
                ],
              ],
              "results": Array [
                Object {
                  "type": "return",
                  "value": undefined,
                },
              ],
            },
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "method": "post",
          "sslOverrides": Object {
            "cert": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "key": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "passphrase": "foobar",
          },
          "url": "https://coolsite.net/issue",
        }
      `);
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: An error has occurred.  Reason: Required field'
      );
    });

    it('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1' }, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json.'
      );
    });

    it('it should throw if the required attributes are not there', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data: { notRequired: 'test' } }));

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Response is missing the expected field: id.'
      );
    });
  });

  describe('updateIncident', () => {
    const incident = {
      incidentId: '1',
      incident: {
        title: 'title',
        description: 'desc',
        tags: ['hello', 'world'],
        id: '10006',
        severity: 'High',
        status: 'Open',
      },
    };

    it('it updates the incident correctly', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      const res = await service.updateIncident(incident);

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: mockTime.toISOString(),
        url: 'https://coolsite.net/browse/CK-1',
      });
    });

    it('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await service.updateIncident(incident);

      expect(requestMock.mock.calls[0][0]).toEqual({
        axios,
        logger,
        method: WebhookMethods.PUT,
        configurationUtilities,
        sslOverrides: defaultSSLOverrides,
        url: 'https://coolsite.net/issue/1',
        data: JSON.stringify({
          fields: {
            title: 'title',
            description: 'desc',
            tags: ['hello', 'world'],
            project: { key: 'ROC' },
            issuetype: { id: '10024' },
          },
        }),
      });
    });

    it('it should call request with correct arguments when authType=SSL', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await sslService.updateIncident(incident);

      // irrelevant snapshot content
      delete requestMock.mock.calls[0][0].configurationUtilities;
      expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "axios": [Function],
          "data": "{\\"fields\\":{\\"title\\":\\"title\\",\\"description\\":\\"desc\\",\\"tags\\":[\\"hello\\",\\"world\\"],\\"project\\":{\\"key\\":\\"ROC\\"},\\"issuetype\\":{\\"id\\":\\"10024\\"}}}",
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction],
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "method": "put",
          "sslOverrides": Object {
            "cert": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "key": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "passphrase": "foobar",
          },
          "url": "https://coolsite.net/issue/1",
        }
      `);
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    it('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1' }, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 1. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json.'
      );
    });
  });

  describe('createComment', () => {
    const commentReq = {
      incidentId: '1',
      comment: {
        comment: 'comment',
        commentId: 'comment-1',
      },
    };
    it('it creates the comment correctly', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await service.createComment(commentReq);

      expect(requestMock.mock.calls[0][0].data).toEqual('{"body":"comment"}');
    });

    it('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await service.createComment(commentReq);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: WebhookMethods.POST,
        configurationUtilities,
        sslOverrides: defaultSSLOverrides,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment"}`,
      });
    });

    it('it should call request with correct arguments when authType=SSL', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );

      await sslService.createComment(commentReq);

      // irrelevant snapshot content
      delete requestMock.mock.calls[0][0].configurationUtilities;
      expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "axios": [Function],
          "data": "{\\"body\\":\\"comment\\"}",
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction],
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "method": "post",
          "sslOverrides": Object {
            "cert": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                67,
                69,
                82,
                84,
                73,
                70,
                73,
                67,
                65,
                84,
                69,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "key": Object {
              "data": Array [
                10,
                45,
                45,
                45,
                45,
                45,
                66,
                69,
                71,
                73,
                78,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
                45,
                45,
                45,
                45,
                45,
                69,
                78,
                68,
                32,
                80,
                82,
                73,
                86,
                65,
                84,
                69,
                32,
                75,
                69,
                89,
                45,
                45,
                45,
                45,
                45,
                10,
              ],
              "type": "Buffer",
            },
            "passphrase": "foobar",
          },
          "url": "https://coolsite.net/issue/1/comment",
        }
      `);
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    it('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1' }, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json.'
      );
    });

    it('it fails silently if createCommentUrl is missing', async () => {
      service = createExternalService(
        actionId,
        {
          config: { ...config, createCommentUrl: '' },
          secrets,
        },
        logger,
        configurationUtilities
      );
      const res = await service.createComment(commentReq);
      expect(requestMock).not.toHaveBeenCalled();
      expect(res).toBeUndefined();
    });

    it('it fails silently if createCommentJson is missing', async () => {
      service = createExternalService(
        actionId,
        {
          config: { ...config, createCommentJson: '' },
          secrets,
        },
        logger,
        configurationUtilities
      );
      const res = await service.createComment(commentReq);
      expect(requestMock).not.toHaveBeenCalled();
      expect(res).toBeUndefined();
    });

    it('properly encodes external system id as string in request body', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );
      service = createExternalService(
        actionId,
        {
          config: {
            ...config,
            createCommentJson: '{"body":{{{case.comment}}},"id":{{{external.system.id}}}}',
          },
          secrets,
        },
        logger,
        configurationUtilities
      );
      await service.createComment(commentReq);
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: WebhookMethods.POST,
        configurationUtilities,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment","id":"1"}`,
        sslOverrides: defaultSSLOverrides,
      });
    });

    it('properly encodes external system id as number in request body', async () => {
      const commentReq2 = {
        incidentId: 1 as unknown as string,
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
      };
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            key: 'CK-1',
          },
        })
      );
      service = createExternalService(
        actionId,
        {
          config: {
            ...config,
            createCommentJson: '{"body":{{{case.comment}}},"id":{{{external.system.id}}}}',
          },
          secrets,
        },
        logger,
        configurationUtilities
      );
      await service.createComment(commentReq2);
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: WebhookMethods.POST,
        configurationUtilities,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment","id":1}`,
        sslOverrides: defaultSSLOverrides,
      });
    });
  });

  describe('bad urls', () => {
    beforeAll(() => {
      service = createExternalService(
        actionId,
        {
          config,
          secrets,
        },
        logger,
        {
          ...configurationUtilities,
          ensureUriAllowed: jest.fn().mockImplementation(() => {
            throw new Error('Uri not allowed');
          }),
        }
      );
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('getIncident- throws for bad url', async () => {
      await expect(service.getIncident('whack')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id whack. Error: Invalid Get case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    it('createIncident- throws for bad url', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Invalid Create case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    it('updateIncident- throws for bad url', async () => {
      const incident = {
        incidentId: '123',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 123. Error: Invalid Update case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    it('createComment- throws for bad url', async () => {
      const commentReq = {
        incidentId: '1',
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
      };
      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: Invalid Create comment URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
  });

  describe('bad protocol', () => {
    beforeAll(() => {
      service = createExternalService(
        actionId,
        {
          config: {
            ...config,
            getIncidentUrl: 'ftp://bad.com',
            createIncidentUrl: 'ftp://bad.com',
            updateIncidentUrl: 'ftp://bad.com',
            createCommentUrl: 'ftp://bad.com',
          },
          secrets,
        },
        logger,
        configurationUtilities
      );
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('getIncident- throws for bad protocol', async () => {
      await expect(service.getIncident('whack')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id whack. Error: Invalid Get case URL: Error: Invalid protocol.'
      );
    });
    it('createIncident- throws for bad protocol', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Invalid Create case URL: Error: Invalid protocol.'
      );
    });
    it('updateIncident- throws for bad protocol', async () => {
      const incident = {
        incidentId: '123',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 123. Error: Invalid Update case URL: Error: Invalid protocol.'
      );
    });
    it('createComment- throws for bad protocol', async () => {
      const commentReq = {
        incidentId: '1',
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
      };
      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: Invalid Create comment URL: Error: Invalid protocol.'
      );
    });
  });

  describe('escape urls', () => {
    beforeAll(() => {
      service = createExternalService(
        actionId,
        {
          config,
          secrets,
        },
        logger,
        {
          ...configurationUtilities,
        }
      );
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '../../malicious-app/malicious-endpoint/',
            key: '../../malicious-app/malicious-endpoint/',
          },
        })
      );
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('getIncident- escapes url', async () => {
      await service.getIncident('../../malicious-app/malicious-endpoint/');
      expect(requestMock.mock.calls[0][0].url).toEqual(
        'https://coolsite.net/issue/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });

    it('createIncident- escapes url', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };
      const res = await service.createIncident(incident);
      expect(res.url).toEqual(
        'https://coolsite.net/browse/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });

    it('updateIncident- escapes url', async () => {
      const incident = {
        incidentId: '../../malicious-app/malicious-endpoint/',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          id: '10006',
          severity: 'High',
          status: 'Open',
        },
      };

      await service.updateIncident(incident);
      expect(requestMock.mock.calls[0][0].url).toEqual(
        'https://coolsite.net/issue/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });
    it('createComment- escapes url', async () => {
      const commentReq = {
        incidentId: '../../malicious-app/malicious-endpoint/',
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
      };

      await service.createComment(commentReq);
      expect(requestMock.mock.calls[0][0].url).toEqual(
        'https://coolsite.net/issue/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F/comment'
      );
    });
  });
});
