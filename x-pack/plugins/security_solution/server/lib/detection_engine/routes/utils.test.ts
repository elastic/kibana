/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { IRuleStatusSOAttributes } from '../rules/types';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  transformBulkError,
  BulkError,
  convertToSnakeCase,
  SiemResponseFactory,
  mergeStatuses,
  getFailingRules,
} from './utils';
import { responseMock } from './__mocks__';
import { exampleRuleStatus } from '../signals/__mocks__/es_results';
import { resolveAlertMock } from './__mocks__/request_responses';
import { AlertExecutionStatusErrorReasons } from '../../../../../alerting/common';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

let rulesClient: ReturnType<typeof rulesClientMock.create>;

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('utils - %s', (_, isRuleRegistryEnabled) => {
  describe('transformBulkError', () => {
    test('returns transformed object if it is a custom error object', () => {
      const customError = new CustomHttpRequestError('some custom error message', 400);
      const transformed = transformBulkError('rule-1', customError);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some custom error message', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a normal error if it is some non custom error that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some message', status_code: 403 },
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a 500 if the status code is not set', () => {
      const error: Error & { statusCode?: number } = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some message', status_code: 500 },
      };
      expect(transformed).toEqual(expected);
    });

    test('it detects a BadRequestError and returns an error status of 400', () => {
      const error: BadRequestError = new BadRequestError('I have a type error');
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'I have a type error', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });
  });

  describe('convertToSnakeCase', () => {
    it('converts camelCase to snakeCase', () => {
      const values = { myTestCamelCaseKey: 'something' };
      expect(convertToSnakeCase(values)).toEqual({ my_test_camel_case_key: 'something' });
    });
    it('returns empty object when object is empty', () => {
      const values = {};
      expect(convertToSnakeCase(values)).toEqual({});
    });
    it('returns null when passed in undefined', () => {
      // Array accessors can result in undefined but
      // this is not represented in typescript for some reason,
      // https://github.com/Microsoft/TypeScript/issues/11122
      const values: SavedObjectsFindResponse<IRuleStatusSOAttributes> = {
        page: 0,
        per_page: 5,
        total: 0,
        saved_objects: [],
      };
      expect(
        convertToSnakeCase<IRuleStatusSOAttributes>(values.saved_objects[0]?.attributes) // this is undefined, but it says it's not
      ).toEqual(null);
    });
  });

  describe('SiemResponseFactory', () => {
    it('builds a custom response', () => {
      const response = responseMock.create();
      const responseFactory = new SiemResponseFactory(response);

      responseFactory.error({ statusCode: 400 });
      expect(response.custom).toHaveBeenCalled();
    });

    it('generates a status_code key on the response', () => {
      const response = responseMock.create();
      const responseFactory = new SiemResponseFactory(response);

      responseFactory.error({ statusCode: 400 });
      const [[{ statusCode, body }]] = response.custom.mock.calls;

      expect(statusCode).toEqual(400);
      expect(body).toBeInstanceOf(Buffer);
      expect(JSON.parse(body!.toString())).toEqual(
        expect.objectContaining({
          message: 'Bad Request',
          status_code: 400,
        })
      );
    });
  });

  describe('mergeStatuses', () => {
    it('merges statuses and converts from camelCase saved object to snake_case HTTP response', () => {
      const statusOne = exampleRuleStatus();
      statusOne.attributes.status = RuleExecutionStatus.failed;
      const statusTwo = exampleRuleStatus();
      statusTwo.attributes.status = RuleExecutionStatus.failed;
      const currentStatus = exampleRuleStatus();
      const foundRules = [currentStatus.attributes, statusOne.attributes, statusTwo.attributes];
      const res = mergeStatuses(currentStatus.references[0].id, foundRules, {
        'myfakealertid-8cfac': {
          current_status: {
            status_date: '2020-03-27T22:55:59.517Z',
            status: RuleExecutionStatus.succeeded,
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null, // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
          },
          failures: [],
        },
      });
      expect(res).toEqual({
        'myfakealertid-8cfac': {
          current_status: {
            status_date: '2020-03-27T22:55:59.517Z',
            status: 'succeeded',
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null, // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
          },
          failures: [],
        },
        'f4b8e31d-cf93-4bde-a265-298bde885cd7': {
          current_status: {
            status_date: '2020-03-27T22:55:59.517Z',
            status: 'succeeded',
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null, // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
          },
          failures: [
            {
              status_date: '2020-03-27T22:55:59.517Z',
              status: 'failed',
              last_failure_at: null,
              last_success_at: '2020-03-27T22:55:59.517Z',
              last_failure_message: null,
              last_success_message: 'succeeded',
              gap: null,
              bulk_create_time_durations: [],
              search_after_time_durations: [],
              last_look_back_date: null, // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
            },
            {
              status_date: '2020-03-27T22:55:59.517Z',
              status: 'failed',
              last_failure_at: null,
              last_success_at: '2020-03-27T22:55:59.517Z',
              last_failure_message: null,
              last_success_message: 'succeeded',
              gap: null,
              bulk_create_time_durations: [],
              search_after_time_durations: [],
              last_look_back_date: null, // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
            },
          ],
        },
      });
    });
  });

  describe('getFailingRules', () => {
    beforeEach(() => {
      rulesClient = rulesClientMock.create();
    });
    it('getFailingRules finds no failing rules', async () => {
      rulesClient.resolve.mockResolvedValue(
        resolveAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
      );
      const res = await getFailingRules(['my-fake-id'], rulesClient);
      expect(res).toEqual({});
    });
    it('getFailingRules finds a failing rule', async () => {
      const foundRule = resolveAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      foundRule.executionStatus = {
        status: 'error',
        lastExecutionDate: foundRule.executionStatus.lastExecutionDate,
        error: {
          reason: AlertExecutionStatusErrorReasons.Read,
          message: 'oops',
        },
      };
      rulesClient.resolve.mockResolvedValue(foundRule);
      const res = await getFailingRules([foundRule.id], rulesClient);
      expect(res).toEqual({ [foundRule.id]: foundRule });
    });
    it('getFailingRules throws an error', async () => {
      rulesClient.resolve.mockImplementation(() => {
        throw new Error('my test error');
      });
      let error;
      try {
        await getFailingRules(['my-fake-id'], rulesClient);
      } catch (exc) {
        error = exc;
      }
      expect(error.message).toEqual(
        'Failed to get executionStatus with RulesClient: my test error'
      );
    });
  });
});
