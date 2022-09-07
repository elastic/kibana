/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import {
  GetRuleExecutionEventsRequestParams,
  GetRuleExecutionEventsRequestQuery,
} from './request_schema';

describe('Request schema of Get rule execution events', () => {
  describe('GetRuleExecutionEventsRequestParams', () => {
    describe('Validation succeeds', () => {
      it('when required parameters are passed', () => {
        const input = {
          ruleId: 'some id',
        };

        const decoded = GetRuleExecutionEventsRequestParams.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(
          expect.objectContaining({
            ruleId: 'some id',
          })
        );
      });

      it('when unknown parameters are passed as well', () => {
        const input = {
          ruleId: 'some id',
          foo: 'bar', // this one is not in the schema and will be stripped
        };

        const decoded = GetRuleExecutionEventsRequestParams.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({
          ruleId: 'some id',
        });
      });
    });

    describe('Validation fails', () => {
      const test = (input: unknown) => {
        const decoded = GetRuleExecutionEventsRequestParams.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors)).length).toBeGreaterThan(0);
        expect(message.schema).toEqual({});
      };

      it('when not all the required parameters are passed', () => {
        const input = {};
        test(input);
      });

      it('when ruleId is an empty string', () => {
        const input: GetRuleExecutionEventsRequestParams = {
          ruleId: '',
        };

        test(input);
      });
    });
  });

  describe('GetRuleExecutionEventsRequestQuery', () => {
    describe('Validation succeeds', () => {
      it('when valid parameters are passed', () => {
        const input = {
          event_types: 'message,status-change',
          log_levels: 'debug,info,error',
          sort_order: 'asc',
          page: 42,
          per_page: 6,
        };

        const decoded = GetRuleExecutionEventsRequestQuery.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({
          event_types: ['message', 'status-change'],
          log_levels: ['debug', 'info', 'error'],
          sort_order: 'asc',
          page: 42,
          per_page: 6,
        });
      });

      it('when unknown parameters are passed as well', () => {
        const input = {
          event_types: 'message,status-change',
          log_levels: 'debug,info,error',
          sort_order: 'asc',
          page: 42,
          per_page: 6,
          foo: 'bar', // this one is not in the schema and will be stripped
        };

        const decoded = GetRuleExecutionEventsRequestQuery.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({
          event_types: ['message', 'status-change'],
          log_levels: ['debug', 'info', 'error'],
          sort_order: 'asc',
          page: 42,
          per_page: 6,
        });
      });

      it('when no parameters are passed (all are have default values)', () => {
        const input = {};

        const decoded = GetRuleExecutionEventsRequestQuery.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(expect.any(Object));
      });
    });

    describe('Validation fails', () => {
      const test = (input: unknown) => {
        const decoded = GetRuleExecutionEventsRequestQuery.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors)).length).toBeGreaterThan(0);
        expect(message.schema).toEqual({});
      };

      it('when invalid parameters are passed', () => {
        test({
          event_types: 'foo,status-change',
        });
      });
    });

    describe('Validation sets default values', () => {
      it('when optional parameters are not passed', () => {
        const input = {};

        const decoded = GetRuleExecutionEventsRequestQuery.decode(input);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({
          event_types: [],
          log_levels: [],
          sort_order: 'desc',
          page: 1,
          per_page: 20,
        });
      });
    });
  });
});
