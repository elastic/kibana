/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showToasterMessage } from './utils';

describe('showToasterMessage', () => {
  describe('exceptionsIncluded is false', () => {
    it('displays main success message if import was successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          errors: [],
        },
        exceptionsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenCalledWith('success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('displays main error message if import was not successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 0,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
        },
        exceptionsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);
      expect(addError).toHaveBeenCalledWith(new Error('errorDetailed: an error message'), {
        title: 'error: 1',
      });
      expect(addSuccess).not.toHaveBeenCalled();
    });
  });

  describe('exceptionsIncluded is true', () => {
    it('displays success message for rules and exceptions if both succeed', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 1,
        },
        exceptionsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(2);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addSuccess).toHaveBeenNthCalledWith(2, 'Successfully imported 1 exception.');
      expect(addError).not.toHaveBeenCalled();
    });

    it('displays error message for rules and exceptions if both fail', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          exceptions_errors: [
            {
              list_id: 'list_id_1',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
            {
              list_id: 'list_id',
              error: {
                status_code: 400,
                message: 'another error message',
              },
            },
          ],
          exceptions_success: false,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(2);
      expect(addError).toHaveBeenNthCalledWith(1, new Error('errorDetailed: an error message'), {
        title: 'error: 1',
      });
      expect(addError).toHaveBeenNthCalledWith(
        2,
        new Error('errorDetailed: an error message. errorDetailed: another error message'),
        {
          title: 'Failed to import 2 exceptions',
        }
      );
      expect(addSuccess).not.toHaveBeenCalled();
    });

    it('displays only a rule toaster if no exceptions were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('displays only an exceptions toaster if no rules were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 0,
          rules_count: 0,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 1,
        },
        exceptionsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'Successfully imported 1 exception.');
      expect(addError).not.toHaveBeenCalled();
    });
  });
});
