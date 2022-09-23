/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { RULE_EXECUTION_STATUSES } from '../../model/execution_status';
import { DefaultSortField, DefaultRuleExecutionStatusCsvArray } from './request_schema';

describe('Request schema of Get rule execution results', () => {
  describe('DefaultRuleExecutionStatusCsvArray', () => {
    describe('Validation succeeds', () => {
      describe('when input is a single rule execution status', () => {
        const cases = RULE_EXECUTION_STATUSES.map((supportedStatus) => {
          return { input: supportedStatus };
        });

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = [input]; // note that it's an array after decode

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
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
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = input;

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
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
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });
    });

    describe('Validation fails', () => {
      describe('when input is a single invalid value', () => {
        const cases = [
          {
            input: 'val',
            expectedErrors: [
              'Invalid value "val" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: '5',
            expectedErrors: [
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: 5,
            expectedErrors: [
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: {},
            expectedErrors: [
              'Invalid value "{}" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });

      describe('when input is an array of invalid values', () => {
        const cases = [
          {
            input: ['value 1', 5],
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: ['value 1', 'succeeded'],
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: ['', 5, {}],
            expectedErrors: [
              'Invalid value "" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "{}" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });

      describe('when input is a string which is a comma-separated array of invalid values', () => {
        const cases = [
          {
            input: 'value 1,5',
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: 'value 1,succeeded',
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
          {
            input: ',5,{}',
            expectedErrors: [
              'Invalid value "" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "5" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
              'Invalid value "{}" supplied to "DefaultCsvArray<RuleExecutionStatus>"',
            ],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });
    });

    describe('Validation returns default value (an empty array)', () => {
      describe('when input is', () => {
        const cases = [{ input: null }, { input: undefined }, { input: '' }, { input: [] }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = DefaultRuleExecutionStatusCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput: string[] = [];

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
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
            const decoded = DefaultSortField.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(input);
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
            const decoded = DefaultSortField.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedErrors = [`Invalid value "${input}" supplied to "DefaultSortField"`];

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });
    });

    describe('Validation returns the default sort field "timestamp"', () => {
      describe('when input is', () => {
        const cases = [{ input: null }, { input: undefined }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = DefaultSortField.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual('timestamp');
          });
        });
      });
    });
  });
});
