/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';

import type { FormData, FormHook, ValidationError } from '../../../shared_imports';
import { ERROR_CODES as ESQL_ERROR_CODES } from '../../rule_creation/logic/esql_validator';
import { EQL_ERROR_CODES } from '../../../common/hooks/eql/api';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../detections/pages/detection_engine/rules/types';

import { useRuleFormsErrors } from './form';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../rule_creation/components/alert_suppression_edit';

const getFormWithErrorsMock = <T extends FormData = FormData>(fields: {
  [key: string]: { errors: Array<ValidationError<EQL_ERROR_CODES | ESQL_ERROR_CODES>> };
}) => {
  return {
    getFields: () => fields,
  } as unknown as FormHook<T, T>;
};

describe('useRuleFormsErrors', () => {
  describe('EQL query validation errors', () => {
    it('should return blocking error in case of syntax validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [
            {
              code: EQL_ERROR_CODES.INVALID_SYNTAX,
              message: '',
              messages: ["line 1:5: missing 'where' at 'demo'"],
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual(["line 1:5: missing 'where' at 'demo'"]);
      expect(nonBlockingErrors).toEqual([]);
    });

    it('should return non-blocking error in case of missing data source validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [
            {
              code: EQL_ERROR_CODES.MISSING_DATA_SOURCE,
              message: '',
              messages: [
                'index_not_found_exception Found 1 problem line -1:-1: Unknown index [*,-*]',
              ],
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual([]);
      expect(nonBlockingErrors).toEqual([
        'Query bar: index_not_found_exception Found 1 problem line -1:-1: Unknown index [*,-*]',
      ]);
    });

    it('should return non-blocking error in case of missing data field validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [
            {
              code: EQL_ERROR_CODES.INVALID_EQL,
              message: '',
              messages: [
                'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
              ],
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual([]);
      expect(nonBlockingErrors).toEqual([
        'Query bar: Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
      ]);
    });

    it('should return non-blocking error in case of failed request error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [
            {
              code: EQL_ERROR_CODES.FAILED_REQUEST,
              message: 'An error occurred while validating your EQL query',
              error: new Error('Some internal error'),
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual([]);
      expect(nonBlockingErrors).toEqual([
        'Query bar: An error occurred while validating your EQL query',
      ]);
    });

    it('should return blocking and non-blocking errors', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [
            {
              code: EQL_ERROR_CODES.MISSING_DATA_SOURCE,
              message: '',
              messages: ['Missing data source'],
            },
          ],
        },
      });
      const aboutStepForm = getFormWithErrorsMock<AboutStepRule>({
        name: {
          errors: [
            {
              message: 'Required field',
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({
        defineStepForm,
        aboutStepForm,
      });

      expect(blockingErrors).toEqual(['Required field']);
      expect(nonBlockingErrors).toEqual(['Query bar: Missing data source']);
    });
  });

  describe('ES|QL query validation errors', () => {
    it('should return blocking error in case of syntax validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const validationError = {
        code: ESQL_ERROR_CODES.INVALID_SYNTAX,
        message: 'Broken ES|QL syntax',
      };
      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [validationError],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual(['Broken ES|QL syntax']);
      expect(nonBlockingErrors).toEqual([]);
    });

    it('should return blocking error in case of missed ES|QL metadata validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const validationError = {
        code: ESQL_ERROR_CODES.ERR_MISSING_ID_FIELD_FROM_RESULT,
        message: 'Metadata is missing',
      };
      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [validationError],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual(['Metadata is missing']);
      expect(nonBlockingErrors).toEqual([]);
    });

    it('should return non-blocking error in case of missing data field validation error', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const validationError = {
        code: ESQL_ERROR_CODES.INVALID_ESQL,
        message: 'Unknown column [hello.world]',
      };
      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: {
          errors: [validationError],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });

      expect(blockingErrors).toEqual([]);
      expect(nonBlockingErrors).toEqual(['Query bar: Unknown column [hello.world]']);
    });
  });

  describe('general cases', () => {
    it('should not return blocking and non-blocking errors in case there are none exist', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({ queryBar: { errors: [] } });
      const aboutStepForm = getFormWithErrorsMock<AboutStepRule>({ name: { errors: [] } });
      const scheduleStepForm = getFormWithErrorsMock<ScheduleStepRule>({
        interval: { errors: [] },
      });
      const actionsStepForm = getFormWithErrorsMock<ActionsStepRule>({ actions: { errors: [] } });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({
        defineStepForm,
        aboutStepForm,
        scheduleStepForm,
        actionsStepForm,
      });

      expect(blockingErrors).toEqual([]);
      expect(nonBlockingErrors).toEqual([]);
    });

    it('should not return all errors', async () => {
      const { result } = renderHook(() => useRuleFormsErrors());

      const esqlValidationError = {
        code: ESQL_ERROR_CODES.INVALID_ESQL,
        message: 'Missing index [logs*]',
      };
      const groupByValidationError = {
        message: 'Number of grouping fields must be at most 3',
      };

      const defineStepForm = getFormWithErrorsMock<DefineStepRule>({
        queryBar: { errors: [esqlValidationError] },
        [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: { errors: [groupByValidationError] },
      });
      const aboutStepForm = getFormWithErrorsMock<AboutStepRule>({
        name: {
          errors: [
            {
              message: 'Required field',
            },
          ],
        },
      });
      const scheduleStepForm = getFormWithErrorsMock<ScheduleStepRule>({
        interval: { errors: [] },
      });
      const actionsStepForm = getFormWithErrorsMock<ActionsStepRule>({
        actions: {
          errors: [
            {
              message: 'Missing webhook connector',
            },
          ],
        },
      });

      const { getRuleFormsErrors } = result.current;
      const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({
        defineStepForm,
        aboutStepForm,
        scheduleStepForm,
        actionsStepForm,
      });

      expect(blockingErrors).toEqual([
        'Number of grouping fields must be at most 3',
        'Required field',
        'Missing webhook connector',
      ]);
      expect(nonBlockingErrors).toEqual(['Query bar: Missing index [logs*]']);
    });
  });
});
