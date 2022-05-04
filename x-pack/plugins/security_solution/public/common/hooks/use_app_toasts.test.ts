/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { IEsError } from 'src/plugins/data/public';
import { KibanaError, SecurityAppError } from '@kbn/securitysolution-t-grid';

import { useToasts } from '../lib/kibana';

import {
  appErrorToErrorStack,
  convertErrorToEnumerable,
  errorToErrorStack,
  errorToErrorStackAdapter,
  esErrorToErrorStack,
  getStringifiedStack,
  isEmptyObjectWhenStringified,
  MaybeESError,
  unknownToErrorStack,
  useAppToasts,
} from './use_app_toasts';

jest.mock('../lib/kibana');

describe('useAppToasts', () => {
  let addErrorMock: jest.Mock;
  let addSuccessMock: jest.Mock;
  let addWarningMock: jest.Mock;
  let removeMock: jest.Mock;

  beforeEach(() => {
    addErrorMock = jest.fn();
    addSuccessMock = jest.fn();
    addWarningMock = jest.fn();
    removeMock = jest.fn();
    (useToasts as jest.Mock).mockImplementation(() => ({
      addError: addErrorMock,
      addSuccess: addSuccessMock,
      addWarning: addWarningMock,
      remove: removeMock,
    }));
  });

  describe('useAppToasts', () => {
    it('works normally with a regular error', async () => {
      const error = new Error('regular error');
      const { result } = renderHook(() => useAppToasts());

      result.current.addError(error, { title: 'title' });

      expect(addErrorMock).toHaveBeenCalledWith(error, { title: 'title' });
    });

    it('converts an unknown error to an Error', () => {
      const unknownError = undefined;

      const { result } = renderHook(() => useAppToasts());

      result.current.addError(unknownError, { title: 'title' });

      expect(addErrorMock).toHaveBeenCalledWith(Error(`${undefined}`), {
        title: 'title',
      });
    });

    it("uses a AppError's body.message as the toastMessage", async () => {
      const kibanaApiError = {
        message: 'Not Found',
        body: { status_code: 404, message: 'Detailed Message' },
      };

      const { result } = renderHook(() => useAppToasts());

      result.current.addError(kibanaApiError, { title: 'title' });

      expect(addErrorMock).toHaveBeenCalledWith(Error('Detailed Message (404)'), {
        title: 'title',
      });
    });

    it("parses AppError's body in the stack trace", async () => {
      const kibanaApiError = {
        message: 'Not Found',
        body: { status_code: 404, message: 'Detailed Message' },
      };

      const { result } = renderHook(() => useAppToasts());

      result.current.addError(kibanaApiError, { title: 'title' });
      const errorObj = addErrorMock.mock.calls[0][0];
      expect(errorObj.name).toEqual('');
      expect(JSON.parse(errorObj.stack)).toEqual({
        message: 'Not Found',
        body: { status_code: 404, message: 'Detailed Message' },
      });
    });

    it('works normally with a bsearch type error', async () => {
      const error = {
        message: 'some message',
        attributes: {}, // empty object and should not show up in the output
        err: {
          statusCode: 400,
          innerMessages: { somethingElse: 'message' },
        },
      } as unknown as IEsError;
      const { result } = renderHook(() => useAppToasts());

      result.current.addError(error, { title: 'title' });
      const expected = Error('some message (400)');
      expect(addErrorMock).toHaveBeenCalledWith(expected, { title: 'title' });
    });

    it('parses a bsearch correctly in the stack and name', async () => {
      const error = {
        message: 'some message',
        attributes: {}, // empty object and should not show up in the output
        err: {
          statusCode: 400,
          innerMessages: { somethingElse: 'message' },
        },
      } as unknown as IEsError;
      const { result } = renderHook(() => useAppToasts());
      result.current.addError(error, { title: 'title' });
      const errorObj = addErrorMock.mock.calls[0][0];
      expect(errorObj.name).toEqual('some message');
      expect(JSON.parse(errorObj.stack)).toEqual({
        statusCode: 400,
        innerMessages: {
          somethingElse: 'message',
        },
      });
    });
  });

  describe('errorToErrorStackAdapter', () => {
    it('works normally with a regular error', async () => {
      const error = new Error('regular error');
      const result = errorToErrorStackAdapter(error);
      expect(result).toEqual(error);
    });

    it('has a stack on the error with name, message, and a stack call', async () => {
      const error = new Error('regular error');
      const result = errorToErrorStackAdapter(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack.name).toEqual('Error');
      expect(parsedStack.message).toEqual('regular error');
      expect(parsedStack.stack).toEqual(expect.stringContaining('Error: regular error'));
    });

    it('converts an unknown error to an Error', () => {
      const unknownError = undefined;
      const result = errorToErrorStackAdapter(unknownError);
      expect(result).toEqual(Error('undefined'));
    });

    it("uses a AppError's body.message", async () => {
      const kibanaApiError = {
        message: 'Not Found',
        body: { status_code: 404, message: 'Detailed Message' },
      };
      const result = errorToErrorStackAdapter(kibanaApiError);
      expect(result).toEqual(Error('Detailed Message (404)'));
    });

    it("parses AppError's body in the stack trace", async () => {
      const kibanaApiError = {
        message: 'Not Found',
        body: { status_code: 404, message: 'Detailed Message' },
      };
      const result = errorToErrorStackAdapter(kibanaApiError);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack.message).toEqual('Not Found');
      expect(parsedStack.body).toEqual({ status_code: 404, message: 'Detailed Message' });
    });

    it('works normally with a bsearch type error', async () => {
      const error = {
        message: 'some message',
        attributes: {}, // empty object and should not show up in the output
        err: {
          statusCode: 400,
          innerMessages: { somethingElse: 'message' },
        },
      } as unknown as IEsError;
      const result = errorToErrorStackAdapter(error);
      expect(result).toEqual(Error('some message (400)'));
    });

    it('parses a bsearch correctly in the stack and name', async () => {
      const error = {
        message: 'some message',
        attributes: {}, // empty object and should not show up in the output
        err: {
          statusCode: 400,
          innerMessages: { somethingElse: 'message' },
        },
      } as unknown as IEsError;
      const result = errorToErrorStackAdapter(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({
        statusCode: 400,
        innerMessages: {
          somethingElse: 'message',
        },
      });
    });
  });

  describe('esErrorToErrorStack', () => {
    it('works with a IEsError that is not an EsError', async () => {
      const error: IEsError = {
        statusCode: 200,
        message: 'a message',
      };
      const result = esErrorToErrorStack(error);
      expect(result).toEqual(Error('a message (200)'));
    });

    it('creates a stack trace of a IEsError that is not an EsError', async () => {
      const error: IEsError = {
        statusCode: 200,
        message: 'a message',
      };
      const result = esErrorToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({ statusCode: 200, message: 'a message' });
    });

    it('prefers the attributes reason if we have it for the message', async () => {
      const error: IEsError = {
        attributes: { type: 'some type', reason: 'message we want' },
        statusCode: 200,
        message: 'message we do not want',
      };
      const result = esErrorToErrorStack(error);
      expect(result).toEqual(Error('message we want (200)'));
    });

    it('works with an EsError, by using the inner error and not outer error if available', async () => {
      const error: MaybeESError = {
        attributes: { type: 'some type', reason: 'message we want' },
        statusCode: 400,
        err: {
          statusCode: 200,
          attributes: { reason: 'attribute message we do not want' },
        },
        message: 'main message we do not want',
      };
      const result = esErrorToErrorStack(error);
      expect(result).toEqual(Error('message we want (200)'));
    });

    it('creates a stack trace of a EsError and not the outer object', async () => {
      const error: MaybeESError = {
        attributes: { type: 'some type', reason: 'message we do not want' },
        statusCode: 400,
        err: {
          statusCode: 200,
          attributes: { reason: 'attribute message we do want' },
        },
        message: 'main message we do not want',
      };
      const result = esErrorToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({
        statusCode: 200,
        attributes: { reason: 'attribute message we do want' },
      });
    });
  });

  describe('appErrorToErrorStack', () => {
    it('works with a AppError that is a KibanaError', async () => {
      const error: KibanaError = {
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          statusCode: 200,
        },
      };
      const result = appErrorToErrorStack(error);
      expect(result).toEqual(Error('a message (200)'));
    });

    it('creates a stack trace of a KibanaError', async () => {
      const error: KibanaError = {
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          statusCode: 200,
        },
      };
      const result = appErrorToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          statusCode: 200,
        },
      });
    });

    it('works with a AppError that is a SecurityAppError', async () => {
      const error: SecurityAppError = {
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          status_code: 200,
        },
      };
      const result = appErrorToErrorStack(error);
      expect(result).toEqual(Error('a message (200)'));
    });

    it('creates a stack trace of a SecurityAppError', async () => {
      const error: SecurityAppError = {
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          status_code: 200,
        },
      };
      const result = appErrorToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({
        message: 'message',
        name: 'some name',
        body: {
          message: 'a message',
          status_code: 200,
        },
      });
    });
  });

  describe('errorToErrorStack', () => {
    it('works with an Error', async () => {
      const error: Error = {
        message: 'message',
        name: 'some name',
      };
      const result = errorToErrorStack(error);
      expect(result).toEqual(Error('message'));
    });

    it('creates a stack trace of an Error', async () => {
      const error: Error = {
        message: 'message',
        name: 'some name',
      };
      const result = errorToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual({
        message: 'message',
        name: 'some name',
      });
    });
  });

  describe('unknownToErrorStack', () => {
    it('works with a string', async () => {
      const error = 'error';
      const result = unknownToErrorStack(error);
      expect(result).toEqual(Error('error'));
    });

    it('works with an object that has fields by using a stringification of it', async () => {
      const error = { a: 1, b: 1 };
      const result = unknownToErrorStack(error);
      expect(result).toEqual(Error(JSON.stringify(error, null, 2)));
    });

    it('works with an an array that has fields by using a stringification of it', async () => {
      const error = [{ a: 1, b: 1 }];
      const result = unknownToErrorStack(error);
      expect(result).toEqual(Error(JSON.stringify(error, null, 2)));
    });

    it('does create a stack error from a plain string of that string', async () => {
      const error = 'error';
      const result = unknownToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual(error);
    });

    it('does create a stack with an object that has fields by using a stringification of it', async () => {
      const error = { a: 1, b: 1 };
      const result = unknownToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual(error);
    });

    it('does create a stack with an an array that has fields by using a stringification of it', async () => {
      const error = [{ a: 1, b: 1 }];
      const result = unknownToErrorStack(error);
      const parsedStack = JSON.parse(result.stack ?? '');
      expect(parsedStack).toEqual(error);
    });
  });

  describe('getStringifiedStack', () => {
    it('works with an Error object', async () => {
      const result = getStringifiedStack(new Error('message'));
      const parsedResult = JSON.parse(result ?? '');
      expect(parsedResult.name).toEqual('Error');
      expect(parsedResult.message).toEqual('message');
      expect(parsedResult.stack).toEqual(expect.stringContaining('Error: message'));
    });

    it('works with a regular object', async () => {
      const regularObject = { a: 'regular object' };
      const result = getStringifiedStack(regularObject);
      const parsedResult = JSON.parse(result ?? '');
      expect(parsedResult).toEqual(regularObject);
    });

    it('returns undefined with a circular reference', async () => {
      const circleRef = { a: {} };
      circleRef.a = circleRef;
      const result = getStringifiedStack(circleRef);
      expect(result).toEqual(undefined);
    });

    it('returns undefined if given an empty object', async () => {
      const emptyObj = {};
      const result = getStringifiedStack(emptyObj);
      expect(result).toEqual(undefined);
    });

    it('returns a string if given a string', async () => {
      const stringValue = 'some value';
      const result = getStringifiedStack(stringValue);
      expect(result).toEqual(`"${stringValue}"`);
    });

    it('returns an array if given an array', async () => {
      const value = ['some value'];
      const result = getStringifiedStack(value);
      const parsedResult = JSON.parse(result ?? '');
      expect(parsedResult).toEqual(value);
    });

    it('removes top level empty objects if found to clean things up a bit', async () => {
      const objectWithEmpties = { a: {}, b: { c: 1 }, d: {}, e: {} };
      const result = getStringifiedStack(objectWithEmpties);
      const parsedResult = JSON.parse(result ?? '');
      expect(parsedResult).toEqual({ b: { c: 1 } });
    });
  });

  describe('convertErrorToEnumerable', () => {
    test('it will return a stringable Error object', () => {
      const converted = convertErrorToEnumerable(new Error('message'));
      // delete the stack off the converted for testing determinism
      delete (converted as Error).stack;
      expect(JSON.stringify(converted)).toEqual(
        JSON.stringify({ name: 'Error', message: 'message' })
      );
    });

    test('it will return a value not touched if it is not an error instances', () => {
      const obj = { a: 1 };
      const converted = convertErrorToEnumerable(obj);
      expect(converted).toBe(obj);
    });
  });

  describe('isEmptyObjectWhenStringified', () => {
    test('it returns false when handed a non-object', () => {
      expect(isEmptyObjectWhenStringified('string')).toEqual(false);
    });

    test('it returns false when handed a non-empty object', () => {
      expect(isEmptyObjectWhenStringified({ a: 1 })).toEqual(false);
    });

    test('it returns true when handed an empty object', () => {
      expect(isEmptyObjectWhenStringified({})).toEqual(true);
    });
  });
});
