/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { transformBulkError, BulkError, convertToSnakeCase, SiemResponseFactory } from './utils';
import { responseMock } from './__mocks__';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

describe('utils', () => {
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
      interface Foo {
        bar: Record<string, unknown>;
      }

      // Array accessors can result in undefined but
      // this is not represented in typescript for some reason,
      // https://github.com/Microsoft/TypeScript/issues/11122
      const array: Foo[] = [];

      // This is undefined, but it says it's not
      const undefinedValue = array[0]?.bar;

      expect(convertToSnakeCase(undefinedValue)).toEqual(null);
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
});
