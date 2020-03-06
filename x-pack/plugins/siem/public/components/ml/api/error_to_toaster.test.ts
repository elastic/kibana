/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAnError, isToasterError, errorToToaster } from './error_to_toaster';
import { ToasterErrors } from './throw_if_not_ok';

describe('error_to_toaster', () => {
  let dispatchToaster = jest.fn();

  beforeEach(() => {
    dispatchToaster = jest.fn();
  });

  describe('#errorToToaster', () => {
    test('adds a ToastError given multiple toaster errors', () => {
      const error = new ToasterErrors(['some error 1', 'some error 2']);
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

    test('adds a ToastError given a single toaster errors', () => {
      const error = new ToasterErrors(['some error 1']);
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

    test('adds a regular Error given a single error', () => {
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

  describe('#isAnError', () => {
    test('returns true if given an error object', () => {
      const error = new Error('some error');
      expect(isAnError(error)).toEqual(true);
    });

    test('returns false if given a regular object', () => {
      expect(isAnError({})).toEqual(false);
    });

    test('returns false if given a string', () => {
      expect(isAnError('som string')).toEqual(false);
    });

    test('returns true if given a toaster error', () => {
      const error = new ToasterErrors(['some error']);
      expect(isAnError(error)).toEqual(true);
    });
  });

  describe('#isToasterError', () => {
    test('returns true if given a ToasterErrors object', () => {
      const error = new ToasterErrors(['some error']);
      expect(isToasterError(error)).toEqual(true);
    });

    test('returns false if given a regular object', () => {
      expect(isToasterError({})).toEqual(false);
    });

    test('returns false if given a string', () => {
      expect(isToasterError('som string')).toEqual(false);
    });

    test('returns false if given a regular error', () => {
      const error = new Error('some error');
      expect(isToasterError(error)).toEqual(false);
    });
  });
});
