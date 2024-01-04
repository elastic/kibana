/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { RuleExecutionStatus } from '../../model';
import { GetRuleExecutionResultsRequestQuery } from './get_rule_execution_results_route.gen';

const StatusFiltersSchema = GetRuleExecutionResultsRequestQuery.shape.status_filters;
const SortFieldSchema = GetRuleExecutionResultsRequestQuery.shape.sort_field;

describe('Request schema of Get rule execution results', () => {
  describe('DefaultRuleExecutionStatusCsvArray', () => {
    describe('Validation succeeds', () => {
      describe('when input is a single rule execution status', () => {
        const cases = RuleExecutionStatus.options.map((supportedStatus) => {
          return { input: supportedStatus };
        });

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const expectedOutput = [input]; // note that it's an array after decode
            const result = StatusFiltersSchema.safeParse(input);

            expectParseSuccess(result);
            expect(result.data).toEqual(expectedOutput);
          });
        });
      });

      describe('when input is an array of rule execution statuses', () => {
        const cases = [
          { input: ['succeeded', 'failed'] },
          { input: ['partial failure', 'going to run', 'running'] },
        ];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const expectedOutput = input;
            const result = StatusFiltersSchema.safeParse(input);

            expectParseSuccess(result);
            expect(result.data).toEqual(expectedOutput);
          });
        });
      });

      describe('when input is a string which is a comma-separated array of statuses', () => {
        const cases = [
          {
            input: 'succeeded,failed',
            expectedOutput: ['succeeded', 'failed'],
          },
          {
            input: 'partial failure,going to run,running',
            expectedOutput: ['partial failure', 'going to run', 'running'],
          },
        ];

        cases.forEach(({ input, expectedOutput }) => {
          it(`${input}`, () => {
            const result = StatusFiltersSchema.safeParse(input);

            expectParseSuccess(result);
            expect(result.data).toEqual(expectedOutput);
          });
        });
      });
    });

    describe('Validation fails', () => {
      describe('when input is a single invalid value', () => {
        const cases = [
          {
            input: 'val',
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received 'val'",
          },
          {
            input: '5',
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '5'",
          },
          {
            input: 5,
            expectedErrors: 'Expected array, received number',
          },
          {
            input: {},
            expectedErrors: 'Expected array, received object',
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const result = StatusFiltersSchema.safeParse(input);

            expectParseError(result);
            expect(stringifyZodError(result.error)).toEqual(expectedErrors);
          });
        });
      });

      describe('when input is an array of invalid values', () => {
        const cases = [
          {
            input: ['value 1', 5],
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received 'value 1', 1: Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received number",
          },
          {
            input: ['value 1', 'succeeded'],
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received 'value 1'",
          },
          {
            input: ['', 5, {}],
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '', 1: Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received number, 2: Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received object",
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const result = StatusFiltersSchema.safeParse(input);

            expectParseError(result);
            expect(stringifyZodError(result.error)).toEqual(expectedErrors);
          });
        });
      });

      describe('when input is a string which is a comma-separated array of invalid values', () => {
        const cases = [
          {
            input: 'value 1,5',
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received 'value 1', 1: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '5'",
          },
          {
            input: 'value 1,succeeded',
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received 'value 1'",
          },
          {
            input: ',5,{}',
            expectedErrors:
              "0: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '', 1: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '5', 2: Invalid enum value. Expected 'going to run' | 'running' | 'partial failure' | 'failed' | 'succeeded', received '{}'",
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const result = StatusFiltersSchema.safeParse(input);

            expectParseError(result);
            expect(stringifyZodError(result.error)).toEqual(expectedErrors);
          });
        });
      });
    });

    describe('Validation returns default value (an empty array)', () => {
      describe('when input is', () => {
        const cases = [{ input: undefined }, { input: '' }, { input: [] }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const result = StatusFiltersSchema.safeParse(input);

            expectParseSuccess(result);
            expect(result.data).toEqual([]);
          });
        });
      });
    });
  });

  describe('DefaultSortField', () => {
    describe('Validation succeeds', () => {
      describe('when input is a valid sort field', () => {
        const cases = [
          { input: 'timestamp' },
          { input: 'duration_ms' },
          { input: 'gap_duration_s' },
          { input: 'indexing_duration_ms' },
          { input: 'search_duration_ms' },
          { input: 'schedule_delay_ms' },
        ];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const result = SortFieldSchema.safeParse(input);
            expectParseSuccess(result);
            expect(result.data).toEqual(input);
          });
        });
      });
    });

    describe('Validation fails', () => {
      describe('when input is an invalid sort field', () => {
        const cases = [
          { input: 'status' },
          { input: 'message' },
          { input: 'es_search_duration_ms' },
          { input: 'security_status' },
          { input: 'security_message' },
        ];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const expectedErrors = `Invalid enum value. Expected 'timestamp' | 'duration_ms' | 'gap_duration_s' | 'indexing_duration_ms' | 'search_duration_ms' | 'schedule_delay_ms', received '${input}'`;
            const result = SortFieldSchema.safeParse(input);
            expectParseError(result);
            expect(stringifyZodError(result.error)).toEqual(expectedErrors);
          });
        });
      });
    });

    describe('Validation returns the default sort field "timestamp"', () => {
      describe('when input is', () => {
        const cases = [{ input: undefined }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const result = SortFieldSchema.safeParse(input);
            expectParseSuccess(result);
            expect(result.data).toEqual('timestamp');
          });
        });
      });
    });
  });

  describe('GetRuleExecutionResultsRequestQuery', () => {
    it('should convert string values to numbers', () => {
      const result = GetRuleExecutionResultsRequestQuery.safeParse({
        start: '2021-08-01T00:00:00.000Z',
        end: '2021-08-02T00:00:00.000Z',
        page: '1',
        per_page: '10',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({
        end: '2021-08-02T00:00:00.000Z',
        page: 1,
        per_page: 10,
        query_text: '',
        sort_field: 'timestamp',
        sort_order: 'desc',
        start: '2021-08-01T00:00:00.000Z',
        status_filters: [],
      });
    });
  });
});
