/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errorToToaster } from './utils';
import { ToasterError } from './errors';

const ApiError = class extends Error {
  public body: {} = {};
};

describe('error_to_toaster', () => {
  let dispatchToaster = jest.fn();

  beforeEach(() => {
    dispatchToaster = jest.fn();
  });

  describe('#errorToToaster', () => {
    test('dispatches an error toast given a ToasterError with multiple error messages', () => {
      const error = new ToasterError(['some error 1', 'some error 2']);
      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['some error 1', 'some error 2'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });

    test('dispatches an error toast given a ToasterError with a single error message', () => {
      const error = new ToasterError(['some error 1']);
      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['some error 1'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });

    test('dispatches an error toast given an ApiError with a message', () => {
      const error = new ApiError('Internal Server Error');
      error.body = { message: 'something bad happened', status_code: 500 };

      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['something bad happened'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });

    test('dispatches an error toast given an ApiError with no message', () => {
      const error = new ApiError('Internal Server Error');

      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['Internal Server Error'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });

    test('dispatches an error toast given a standard Error', () => {
      const error = new Error('some error 1');
      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['some error 1'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });

    test('adds a generic Network Error given a non Error object such as a string', () => {
      const error = 'terrible string';
      errorToToaster({ id: 'some-made-up-id', title: 'some title', error, dispatchToaster });
      expect(dispatchToaster.mock.calls[0]).toEqual([
        {
          toast: {
            color: 'danger',
            errors: ['Network Error'],
            iconType: 'alert',
            id: 'some-made-up-id',
            title: 'some title',
          },
          type: 'addToaster',
        },
      ]);
    });
  });
});
