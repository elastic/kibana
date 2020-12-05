/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';

import { SavedObjectsFindResponse } from 'kibana/server';

import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { IRuleSavedAttributesSavedObjectAttributes, IRuleStatusSOAttributes } from '../rules/types';
import { BadRequestError } from '../errors/bad_request_error';
import {
  transformError,
  transformBulkError,
  BulkError,
  createSuccessObject,
  ImportSuccessError,
  createImportErrorObject,
  transformImportError,
  convertToSnakeCase,
  SiemResponseFactory,
  mergeStatuses,
  getFailingRules,
} from './utils';
import { responseMock } from './__mocks__';
import { exampleRuleStatus, exampleFindRuleStatusResponse } from '../signals/__mocks__/es_results';
import { getResult } from './__mocks__/request_responses';
import { AlertExecutionStatusErrorReasons } from '../../../../../alerts/common';

let alertsClient: ReturnType<typeof alertsClientMock.create>;

describe('utils', () => {
  describe('transformError', () => {
    test('returns transformed output error from boom object with a 500 and payload of internal server error', () => {
      const boom = new Boom('some boom message');
      const transformed = transformError(boom);
      expect(transformed).toEqual({
        message: 'An internal server error occurred',
        statusCode: 500,
      });
    });

    test('returns transformed output if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 403,
      });
    });

    test('returns a transformed message with the message set and statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 403,
      });
    });

    test('transforms best it can if it is some non boom object but it does not have a status Code.', () => {
      const error: Error = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 500,
      });
    });

    test('it detects a BadRequestError and returns a status code of 400 from that particular error type', () => {
      const error: BadRequestError = new BadRequestError('I have a type error');
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'I have a type error',
        statusCode: 400,
      });
    });

    test('it detects a BadRequestError and returns a Boom status of 400', () => {
      const error: BadRequestError = new BadRequestError('I have a type error');
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'I have a type error',
        statusCode: 400,
      });
    });
  });

  describe('transformBulkError', () => {
    test('returns transformed object if it is a boom object', () => {
      const boom = new Boom('some boom message', { statusCode: 400 });
      const transformed = transformBulkError('rule-1', boom);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some boom message', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a normal error if it is some non boom object that has a statusCode', () => {
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

    test('it detects a BadRequestError and returns a Boom status of 400', () => {
      const error: BadRequestError = new BadRequestError('I have a type error');
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'I have a type error', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });
  });

  describe('createSuccessObject', () => {
    test('it should increment the existing success object by 1', () => {
      const success = createSuccessObject({
        success_count: 0,
        success: true,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: true,
        errors: [],
      };
      expect(success).toEqual(expected);
    });

    test('it should increment the existing success object by 1 and not touch the boolean or errors', () => {
      const success = createSuccessObject({
        success_count: 0,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
        ],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
        ],
      };
      expect(success).toEqual(expected);
    });
  });

  describe('createImportErrorObject', () => {
    test('it creates an error message and does not increment the success count', () => {
      const error = createImportErrorObject({
        ruleId: 'some-rule-id',
        statusCode: 400,
        message: 'some-message',
        existingImportSuccessError: {
          success_count: 1,
          success: true,
          errors: [],
        },
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      };
      expect(error).toEqual(expected);
    });

    test('appends a second error message and does not increment the success count', () => {
      const error = createImportErrorObject({
        ruleId: 'some-rule-id',
        statusCode: 400,
        message: 'some-message',
        existingImportSuccessError: {
          success_count: 1,
          success: false,
          errors: [
            { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
          ],
        },
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
        ],
      };
      expect(error).toEqual(expected);
    });
  });

  describe('transformImportError', () => {
    test('returns transformed object if it is a boom object', () => {
      const boom = new Boom('some boom message', { statusCode: 400 });
      const transformed = transformImportError('rule-1', boom, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 400, message: 'some boom message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a normal error if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 403, message: 'some message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a 500 if the status code is not set', () => {
      const error: Error & { statusCode?: number } = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('it detects a BadRequestError and returns a Boom status of 400', () => {
      const error: BadRequestError = new BadRequestError('I have a type error');
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 400, message: 'I have a type error' } },
        ],
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
      const values: SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes> = {
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
      statusOne.attributes.status = 'failed';
      const statusTwo = exampleRuleStatus();
      statusTwo.attributes.status = 'failed';
      const currentStatus = exampleRuleStatus();
      const foundRules = exampleFindRuleStatusResponse([currentStatus, statusOne, statusTwo]);
      const res = mergeStatuses(currentStatus.attributes.alertId, foundRules.saved_objects, {
        'myfakealertid-8cfac': {
          current_status: {
            alert_id: 'myfakealertid-8cfac',
            status_date: '2020-03-27T22:55:59.517Z',
            status: 'succeeded',
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null,
          },
          failures: [],
        },
      });
      expect(res).toEqual({
        'myfakealertid-8cfac': {
          current_status: {
            alert_id: 'myfakealertid-8cfac',
            status_date: '2020-03-27T22:55:59.517Z',
            status: 'succeeded',
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null,
          },
          failures: [],
        },
        'f4b8e31d-cf93-4bde-a265-298bde885cd7': {
          current_status: {
            alert_id: 'f4b8e31d-cf93-4bde-a265-298bde885cd7',
            status_date: '2020-03-27T22:55:59.517Z',
            status: 'succeeded',
            last_failure_at: null,
            last_success_at: '2020-03-27T22:55:59.517Z',
            last_failure_message: null,
            last_success_message: 'succeeded',
            gap: null,
            bulk_create_time_durations: [],
            search_after_time_durations: [],
            last_look_back_date: null,
          },
          failures: [
            {
              alert_id: 'f4b8e31d-cf93-4bde-a265-298bde885cd7',
              status_date: '2020-03-27T22:55:59.517Z',
              status: 'failed',
              last_failure_at: null,
              last_success_at: '2020-03-27T22:55:59.517Z',
              last_failure_message: null,
              last_success_message: 'succeeded',
              gap: null,
              bulk_create_time_durations: [],
              search_after_time_durations: [],
              last_look_back_date: null,
            },
            {
              alert_id: 'f4b8e31d-cf93-4bde-a265-298bde885cd7',
              status_date: '2020-03-27T22:55:59.517Z',
              status: 'failed',
              last_failure_at: null,
              last_success_at: '2020-03-27T22:55:59.517Z',
              last_failure_message: null,
              last_success_message: 'succeeded',
              gap: null,
              bulk_create_time_durations: [],
              search_after_time_durations: [],
              last_look_back_date: null,
            },
          ],
        },
      });
    });
  });

  describe('getFailingRules', () => {
    beforeEach(() => {
      alertsClient = alertsClientMock.create();
    });
    it('getFailingRules finds no failing rules', async () => {
      alertsClient.get.mockResolvedValue(getResult());
      const res = await getFailingRules(['my-fake-id'], alertsClient);
      expect(res).toEqual({});
    });
    it('getFailingRules finds a failing rule', async () => {
      const foundRule = getResult();
      foundRule.executionStatus = {
        status: 'error',
        lastExecutionDate: foundRule.executionStatus.lastExecutionDate,
        error: {
          reason: AlertExecutionStatusErrorReasons.Read,
          message: 'oops',
        },
      };
      alertsClient.get.mockResolvedValue(foundRule);
      const res = await getFailingRules([foundRule.id], alertsClient);
      expect(res).toEqual({ [foundRule.id]: foundRule });
    });
    it('getFailingRules throws an error', async () => {
      alertsClient.get.mockImplementation(() => {
        throw new Error('my test error');
      });
      let error;
      try {
        await getFailingRules(['my-fake-id'], alertsClient);
      } catch (exc) {
        error = exc;
      }
      expect(error.message).toEqual(
        'Failed to get executionStatus with AlertsClient: my test error'
      );
    });
  });
});
