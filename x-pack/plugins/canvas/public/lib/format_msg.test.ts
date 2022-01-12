/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { formatMsg, formatESMsg } from './format_msg';

describe('formatMsg', () => {
  test('should prepend the second argument to result', () => {
    const actual = formatMsg('error message', 'unit_test');

    expect(actual).to.equal('unit_test: error message');
  });

  test('should handle a simple string', () => {
    const actual = formatMsg('error message');

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Error object', () => {
    const err = new Error('error message');
    const actual = formatMsg(err);

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Angular $http error object', () => {
    const err = {
      data: {
        statusCode: 403,
        error: 'Forbidden',
        message:
          '[security_exception] action [indices:data/read/msearch] is unauthorized for user [user]',
      },
      status: 403,
      config: {},
      statusText: 'Forbidden',
    };
    const actual = formatMsg(err);

    expect(actual).to.equal(
      'Error 403 Forbidden: [security_exception] action [indices:data/read/msearch] is unauthorized for user [user]'
    );
  });

  test('should handle an extended elasticsearch error', () => {
    const err = {
      resp: {
        error: {
          root_cause: [
            {
              reason: 'I am the detailed message',
            },
          ],
        },
      },
    };

    const actual = formatMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });

  describe('formatESMsg', () => {
    test('should return undefined if passed a basic error', () => {
      const err = new Error('This is a normal error');

      const actual = formatESMsg(err);

      expect(actual).to.be(undefined);
    });

    test('should return undefined if passed a string', () => {
      const err = 'This is a error string';

      const actual = formatESMsg(err);

      expect(actual).to.be(undefined);
    });

    test('should return the root_cause if passed an extended elasticsearch', () => {
      const err: Record<string, any> = new Error('This is an elasticsearch error');
      err.resp = {
        error: {
          root_cause: [
            {
              reason: 'I am the detailed message',
            },
          ],
        },
      };

      const actual = formatESMsg(err);

      expect(actual).to.equal('I am the detailed message');
    });

    test('should combine the reason messages if more than one is returned.', () => {
      const err: Record<string, any> = new Error('This is an elasticsearch error');
      err.resp = {
        error: {
          root_cause: [
            {
              reason: 'I am the detailed message 1',
            },
            {
              reason: 'I am the detailed message 2',
            },
          ],
        },
      };

      const actual = formatESMsg(err);

      expect(actual).to.equal('I am the detailed message 1\nI am the detailed message 2');
    });
  });
});
