/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import {
  GetRuleExecutionEventsRequestParams,
  GetRuleExecutionEventsRequestQuery,
} from './get_rule_execution_events_route.gen';

describe('Request schema of Get rule execution events', () => {
  describe('GetRuleExecutionEventsRequestParams', () => {
    describe('Validation succeeds', () => {
      it('when required parameters are passed', () => {
        const input = {
          ruleId: 'some id',
        };

        const results = GetRuleExecutionEventsRequestParams.safeParse(input);
        expectParseSuccess(results);

        expect(results.data).toEqual(
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

        const results = GetRuleExecutionEventsRequestParams.safeParse(input);
        expectParseSuccess(results);

        expect(results.data).toEqual(
          expect.objectContaining({
            ruleId: 'some id',
          })
        );
      });
    });

    describe('Validation fails', () => {
      const test = (input: unknown) => {
        const results = GetRuleExecutionEventsRequestParams.safeParse(input);
        expectParseError(results);
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

        const result = GetRuleExecutionEventsRequestQuery.safeParse(input);
        expectParseSuccess(result);

        expect(result.data).toEqual({
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

        const result = GetRuleExecutionEventsRequestQuery.safeParse(input);
        expectParseSuccess(result);

        expect(result.data).toEqual({
          event_types: ['message', 'status-change'],
          log_levels: ['debug', 'info', 'error'],
          sort_order: 'asc',
          page: 42,
          per_page: 6,
        });
      });
    });

    describe('Validation fails', () => {
      const test = (input: unknown) => {
        const result = GetRuleExecutionEventsRequestQuery.safeParse(input);
        expectParseError(result);
      };

      it('when invalid parameters are passed', () => {
        test({
          event_types: 'foo,status-change',
        });
      });
    });

    it('Validation sets default values when optional parameters are not passed', () => {
      const input = {};

      const result = GetRuleExecutionEventsRequestQuery.safeParse(input);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        event_types: [],
        log_levels: [],
        sort_order: 'desc',
        page: 1,
        per_page: 20,
      });
    });
  });
});
