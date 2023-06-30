/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlServicesMock } from '../../../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getRuleMock,
  getUpdateRequest,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  typicalMlRulePayload,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import { updateRuleRoute } from './route';
import {
  getCreateRulesSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../../../../common/detection_engine/rule_schema/mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { RESPONSE_ACTION_TYPES } from '../../../../../../../common/detection_engine/rule_response_actions/schemas';

jest.mock('../../../../../machine_learning/authz');

describe('Update rule route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams())); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful update
    clients.appClient.getSignalsIndex.mockReturnValue('.siem-signals-test-index');

    updateRuleRoute(server.router, ml);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns error when updating non-rule', async () => {
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult());
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    it('returns a 403 if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(),
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getUpdateRulesSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, requestContextMock.convertContext(context));
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'unknown type' },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getUpdateRulesSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
  describe('rule containing response actions', () => {
    beforeEach(() => {
      // @ts-expect-error We're writting to a read only property just for the purpose of the test
      clients.config.experimentalFeatures.endpointResponseActionsEnabled = true;
    });
    const getResponseAction = (command: string = 'isolate') => ({
      action_type_id: '.endpoint',
      params: {
        command,
        comment: '',
      },
    });
    const defaultAction = getResponseAction();

    test('is successful', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [defaultAction],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
    });

    test('fails when isolate rbac is set to false', async () => {
      (context.securitySolution.getEndpointAuthz as jest.Mock).mockReturnValue(() => ({
        canIsolateHost: jest.fn().mockReturnValue(false),
      }));

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [defaultAction],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body.message).toEqual(
        'User is not authorized to change isolate response actions'
      );
    });
    test('fails when isolate rbac and response action is being removed to finish as empty array', async () => {
      (context.securitySolution.getEndpointAuthz as jest.Mock).mockReturnValue(() => ({
        canIsolateHost: jest.fn().mockReturnValue(false),
      }));
      clients.rulesClient.find.mockResolvedValue({
        page: 1,
        perPage: 1,
        total: 1,
        data: [
          getRuleMock({
            ...getQueryRuleParams(),
            responseActions: [
              {
                actionTypeId: RESPONSE_ACTION_TYPES.ENDPOINT,
                params: {
                  command: 'isolate',
                  comment: '',
                },
              },
            ],
          }),
        ],
      });

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body.message).toEqual(
        'User is not authorized to change isolate response actions'
      );
    });
    test('fails when provided with an unsupported command', async () => {
      const wrongAction = getResponseAction('processes');

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [wrongAction],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "processes" supplied to "response_actions,params,command"'
      );
    });
  });
});
