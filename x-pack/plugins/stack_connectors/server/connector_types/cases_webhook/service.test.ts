/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

import { createExternalService } from './service';
import { request, createAxiosResponse } from '@kbn/actions-plugin/server/lib/axios_utils';
import { CasesWebhookMethods, CasesWebhookPublicConfigurationType, ExternalService } from './types';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
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
  createCommentMethod: CasesWebhookMethods.POST,
  createCommentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}/comment',
  createIncidentJson:
    '{"fields":{"title":{{{case.title}}},"description":{{{case.description}}},"tags":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  createIncidentMethod: CasesWebhookMethods.POST,
  createIncidentResponseKey: 'id',
  createIncidentUrl: 'https://coolsite.net/issue',
  getIncidentResponseExternalTitleKey: 'key',
  hasAuth: true,
  headers: { ['content-type']: 'application/json' },
  viewIncidentUrl: 'https://coolsite.net/browse/{{{external.system.title}}}',
  getIncidentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}',
  updateIncidentJson:
    '{"fields":{"title":{{{case.title}}},"description":{{{case.description}}},"tags":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  updateIncidentMethod: CasesWebhookMethods.PUT,
  updateIncidentUrl: 'https://coolsite.net/issue/{{{external.system.id}}}',
};
const secrets = {
  user: 'user',
  password: 'pass',
};
const actionId = '1234';
const mockTime = new Date('2021-10-20T19:41:02.754+0300');
describe('Cases webhook service', () => {
  let service: ExternalService;

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

    test('throws if hasAuth and no user/pass', () => {
      expect(() =>
        createExternalService(
          actionId,
          {
            config,
            secrets: { user: '', password: '' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('does not throw if hasAuth=false and no user/pass', () => {
      expect(() =>
        createExternalService(
          actionId,
          {
            config: { ...config, hasAuth: false },
            secrets: { user: '', password: '' },
          },
          logger,
          configurationUtilities
        )
      ).not.toThrow();
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

    test('it returns the incident correctly', async () => {
      requestMock.mockImplementation(() => createAxiosResponse(axiosRes));
      const res = await service.getIncident('1');
      expect(res).toEqual({
        id: '1',
        title: 'CK-1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => createAxiosResponse(axiosRes));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://coolsite.net/issue/1',
        logger,
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });
      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    test('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ ...axiosRes, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id 1. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json'
      );
    });

    test('it should throw if the required attributes are not there', async () => {
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
        issueType: '10006',
        priority: 'High',
        parent: 'RJ-107',
      },
    };

    test('it creates the incident correctly', async () => {
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

    test('it should call request with correct arguments', async () => {
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
        method: CasesWebhookMethods.POST,
        configurationUtilities,
        data: `{"fields":{"title":"title","description":"desc","tags":["hello","world"],"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}`,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: An error has occurred.  Reason: Required field'
      );
    });

    test('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1' }, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json.'
      );
    });

    test('it should throw if the required attributes are not there', async () => {
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
      },
    };

    test('it updates the incident correctly', async () => {
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

    test('it should call request with correct arguments', async () => {
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
        method: CasesWebhookMethods.PUT,
        configurationUtilities,
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

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    test('it should throw if the request is not a JSON', async () => {
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
    test('it creates the comment correctly', async () => {
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

    test('it should call request with correct arguments', async () => {
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
        method: CasesWebhookMethods.POST,
        configurationUtilities,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment"}`,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: AxiosError = new Error('An error has occurred') as AxiosError;
        error.response = { statusText: 'Required field' } as AxiosResponse;
        throw error;
      });

      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: An error has occurred.  Reason: Required field'
      );
    });

    test('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1' }, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.createComment(commentReq)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create comment at case with id 1. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json.'
      );
    });

    test('it fails silently if createCommentUrl is missing', async () => {
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

    test('it fails silently if createCommentJson is missing', async () => {
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

    test('properly encodes external system id as string in request body', async () => {
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
        method: CasesWebhookMethods.POST,
        configurationUtilities,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment","id":"1"}`,
      });
    });

    test('properly encodes external system id as number in request body', async () => {
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
        method: CasesWebhookMethods.POST,
        configurationUtilities,
        url: 'https://coolsite.net/issue/1/comment',
        data: `{"body":"comment","id":1}`,
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
    test('getIncident- throws for bad url', async () => {
      await expect(service.getIncident('whack')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id whack. Error: Invalid Get case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    test('createIncident- throws for bad url', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Invalid Create case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    test('updateIncident- throws for bad url', async () => {
      const incident = {
        incidentId: '123',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 123. Error: Invalid Update case URL: Error: error configuring connector action: Uri not allowed.'
      );
    });
    test('createComment- throws for bad url', async () => {
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
    test('getIncident- throws for bad protocol', async () => {
      await expect(service.getIncident('whack')).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to get case with id whack. Error: Invalid Get case URL: Error: Invalid protocol.'
      );
    });
    test('createIncident- throws for bad protocol', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };

      await expect(service.createIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to create case. Error: Invalid Create case URL: Error: Invalid protocol.'
      );
    });
    test('updateIncident- throws for bad protocol', async () => {
      const incident = {
        incidentId: '123',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };

      await expect(service.updateIncident(incident)).rejects.toThrow(
        '[Action][Webhook - Case Management]: Unable to update case with id 123. Error: Invalid Update case URL: Error: Invalid protocol.'
      );
    });
    test('createComment- throws for bad protocol', async () => {
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
    test('getIncident- escapes url', async () => {
      await service.getIncident('../../malicious-app/malicious-endpoint/');
      expect(requestMock.mock.calls[0][0].url).toEqual(
        'https://coolsite.net/issue/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });

    test('createIncident- escapes url', async () => {
      const incident = {
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };
      const res = await service.createIncident(incident);
      expect(res.url).toEqual(
        'https://coolsite.net/browse/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });

    test('updateIncident- escapes url', async () => {
      const incident = {
        incidentId: '../../malicious-app/malicious-endpoint/',
        incident: {
          title: 'title',
          description: 'desc',
          tags: ['hello', 'world'],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      };

      await service.updateIncident(incident);
      expect(requestMock.mock.calls[0][0].url).toEqual(
        'https://coolsite.net/issue/..%2F..%2Fmalicious-app%2Fmalicious-endpoint%2F'
      );
    });
    test('createComment- escapes url', async () => {
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
