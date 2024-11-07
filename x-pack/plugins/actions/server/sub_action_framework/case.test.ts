/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { TestCaseConnector } from './mocks';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ConnectorUsageCollector } from '../usage';

describe('CaseConnector', () => {
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let service: TestCaseConnector;
  let connectorUsageCollector: ConnectorUsageCollector;
  const pushToServiceIncidentParamsSchema = {
    name: schema.string(),
    category: schema.nullable(schema.string()),
    foo: schema.arrayOf(schema.boolean()),
    bar: schema.object({
      check: schema.nullable(schema.number()),
    }),
  };

  const incidentSchemaMock = { name: 'Test', category: null, foo: [false], bar: { check: 1 } };
  const pushToServiceParams = {
    incident: { externalId: null, ...incidentSchemaMock },
    comments: [],
  };

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

    service = new TestCaseConnector(
      {
        configurationUtilities: mockedActionsConfig,
        logger,
        connector: { id: 'test-id', type: '.test' },
        config: { url: 'https://example.com' },
        secrets: { username: 'elastic', password: 'changeme' },
        services,
      },
      pushToServiceIncidentParamsSchema
    );

    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
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
          incident: { externalId: 'test', ...incidentSchemaMock },
          comments: [{ comment: 'comment', commentId: 'comment-id' }],
        })
      ).toEqual({
        incident: { externalId: 'test', ...incidentSchemaMock },
        comments: [{ comment: 'comment', commentId: 'comment-id' }],
      });
    });

    it('should accept null for externalId', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.validate({
          incident: { externalId: null, ...incidentSchemaMock },
          comments: [],
        })
      );
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
      expect(
        subAction?.schema?.validate({
          incident: { externalId: 'test', ...incidentSchemaMock },
          comments: null,
        })
      );
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

    it('should throw if necessary schema params not provided', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.validate({
          incident: {
            externalId: 'test',
          },
        })
      ).toThrow('[incident.name]: expected value of type [string] but got [undefined]');
    });

    it('should throw if schema params does not match string type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.validate({
          incident: {
            externalId: 'test',
            name: false,
          },
        })
      ).toThrow('[incident.name]: expected value of type [string] but got [boolean]');
    });

    it('should throw if schema params does not match array type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.validate({
          incident: {
            externalId: 'test',
            name: 'sample',
            foo: null,
          },
        })
      ).toThrow('[incident.foo]: expected value of type [array] but got [null]');
    });

    it('should throw if schema params does not match nested object type', async () => {
      const subActions = service.getSubActions();
      const subAction = subActions.get('pushToService');

      expect(() =>
        subAction?.schema?.validate({
          incident: {
            externalId: 'test',
            name: 'sample',
            foo: [true],
            bar: { check: 'hello' },
          },
        })
      ).toThrow(
        '[incident.bar.check]: types that failed validation:\n- [incident.bar.check.0]: expected value of type [number] but got [string]\n- [incident.bar.check.1]: expected value to equal [null]'
      );
    });
  });

  describe('pushToService', () => {
    it('should create an incident if externalId is null', async () => {
      const res = await service.pushToService(pushToServiceParams, connectorUsageCollector);
      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should update an incident if externalId is not null', async () => {
      const res = await service.pushToService(
        {
          incident: { ...pushToServiceParams.incident, externalId: 'test-id' },
          comments: [],
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'update-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should add comments', async () => {
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          comments: [
            { comment: 'comment-1', commentId: 'comment-id-1' },
            { comment: 'comment-2', commentId: 'comment-id-2' },
          ],
        },
        connectorUsageCollector
      );

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
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          // @ts-expect-error
          comments,
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });

    it('should not add comments if comments are an empty array', async () => {
      const res = await service.pushToService(
        {
          ...pushToServiceParams,
          comments: [],
        },
        connectorUsageCollector
      );

      expect(res).toEqual({
        id: 'create-incident',
        title: 'Test incident',
        url: 'https://example.com',
        pushedDate: '2022-05-06T09:41:00.401Z',
      });
    });
  });

  describe('PushParamsSchema', () => {
    let newService: TestCaseConnector;
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();

      const newPushToServiceSchema = {
        name: schema.string(),
        externalId: schema.number(),
      };

      newService = new TestCaseConnector(
        {
          configurationUtilities: mockedActionsConfig,
          logger,
          connector: { id: 'test-id', type: '.test' },
          config: { url: 'https://example.com' },
          secrets: { username: 'elastic', password: 'changeme' },
          services,
        },
        newPushToServiceSchema
      );
    });

    it('should add externalId as null', async () => {
      const subActions = newService.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(
        subAction?.schema?.validate({
          incident: { name: 'foo' },
          comments: [],
        })
      ).toEqual({
        incident: { name: 'foo', externalId: null },
        comments: [],
      });
    });

    it('should not override externalId schema', async () => {
      const subActions = newService.getSubActions();
      const subAction = subActions.get('pushToService');
      expect(() =>
        subAction?.schema?.validate({
          incident: { name: 'foo', externalId: 123 },
          comments: [],
        })
      ).toThrow(
        '[incident.externalId]: types that failed validation:\n- [incident.externalId.0]: expected value of type [string] but got [number]\n- [incident.externalId.1]: expected value to equal [null]'
      );
    });
  });
});
