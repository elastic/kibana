/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { TestCaseConnector } from './mocks';
import { ActionsConfigurationUtilities } from '../actions_config';

describe('CaseConnector', () => {
  const pushToServiceParams = { incident: { externalId: null }, comments: [] };
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let service: TestCaseConnector;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();

    mockedActionsConfig.getResponseSettings.mockReturnValue({
      maxContentLength: 1000000,
      timeout: 360000,
    });

    service = new TestCaseConnector({
      configurationUtilities: mockedActionsConfig,
      logger,
      connector: { id: 'test-id', type: '.test' },
      config: { url: 'https://example.com' },
      secrets: { username: 'elastic', password: 'changeme' },
      services,
    });
  });

  describe('Sub actions', () => {
    it('registers the pushToService sub action correctly', async () => {
      const subActions = service.getSubActions();
      expect(subActions.get('pushToService')).toEqual({
        method: 'pushToService',
        name: 'pushToService',
        schema: expect.anything(),
      });
    });

    it('should validate the schema of pushToService correctly', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.validate({
          incident: { externalId: 'test' },
          comments: [{ comment: 'comment', commentId: 'comment-id' }],
        })
      ).toEqual({
        incident: { externalId: 'test' },
        comments: [{ comment: 'comment', commentId: 'comment-id' }],
      });
    });

    it('should accept null for externalId', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(subAction?.schema?.validate({ incident: { externalId: null }, comments: [] }));
    });

    it.each([[undefined], [1], [false], [{ test: 'hello' }], [['test']], [{ test: 'hello' }]])(
      'should throw if externalId is %p',
      async (externalId) => {
        const subActions = service.getSubActions();
        const subAction = subActions.get('pushToService');
        expect(() => subAction?.schema?.validate({ externalId, comments: [] }));
      }
    );

    it('should accept null for comments', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(subAction?.schema?.validate({ incident: { externalId: 'test' }, comments: null }));
    });

    it.each([
      [undefined],
      [1],
      [false],
      [{ test: 'hello' }],
      [['test']],
      [{ test: 'hello' }],
      [{ comment: 'comment', commentId: 'comment-id', foo: 'foo' }],
    ])('should throw if comments %p', async (comments) => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(() => subAction?.schema?.validate({ incident: { externalId: 'test' }, comments }));
    });

    it('should allow any field in the params', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(
        subAction?.schema?.validate({
          incident: {
            externalId: 'test',
            foo: 'foo',
            bar: 1,
            baz: [{ test: 'hello' }, 1, 'test', false],
            isValid: false,
            val: null,
          },
          comments: [{ comment: 'comment', commentId: 'comment-id' }],
        })
      ).toEqual({
        incident: {
          externalId: 'test',
          foo: 'foo',
          bar: 1,
          baz: [{ test: 'hello' }, 1, 'test', false],
          isValid: false,
          val: null,
        },
        comments: [{ comment: 'comment', commentId: 'comment-id' }],
      });
    });
  });

  describe('pushToService', () => {
    it('should create an incident if externalId is null', async () => {
      const res = await service.pushToService(pushToServiceParams);
      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should update an incident if externalId is not null', async () => {
      const res = await service.pushToService({
        ...pushToServiceParams,
        incident: { externalId: 'test-id' },
      });

      expect(res).toEqual({
        id: 'update-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should add comments', async () => {
      const res = await service.pushToService({
        ...pushToServiceParams,
        comments: [
          { comment: 'comment-1', commentId: 'comment-id-1' },
          { comment: 'comment-2', commentId: 'comment-id-2' },
        ],
      });

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
        comments: [
          {
            commentId: 'comment-id-1',
            pushedDate: '2022-05-06T09:41:00.401Z',
          },
          {
            commentId: 'comment-id-2',
            pushedDate: '2022-05-06T09:41:00.401Z',
          },
        ],
      });
    });

    it.each([[undefined], [null]])('should throw if externalId is %p', async (comments) => {
      const res = await service.pushToService({
        ...pushToServiceParams,
        // @ts-expect-error
        comments,
      });

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should not add comments if comments are an empty array', async () => {
      const res = await service.pushToService({
        ...pushToServiceParams,
        comments: [],
      });

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });
  });
});
