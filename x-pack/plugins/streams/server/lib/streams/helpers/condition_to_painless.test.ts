/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToPainless, conditionToStatement } from './condition_to_painless';

const operatorConditionAndResults = [
  {
    condition: { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
    result: '(ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy")',
  },
  {
    condition: { field: 'log.logger', operator: 'neq' as const, value: 'nginx_proxy' },
    result: '(ctx.log?.logger !== null && ctx.log?.logger != "nginx_proxy")',
  },
  {
    condition: { field: 'http.response.status_code', operator: 'lt' as const, value: 500 },
    result: '(ctx.http?.response?.status_code !== null && ctx.http?.response?.status_code < 500)',
  },
  {
    condition: { field: 'http.response.status_code', operator: 'lte' as const, value: 500 },
    result: '(ctx.http?.response?.status_code !== null && ctx.http?.response?.status_code <= 500)',
  },
  {
    condition: { field: 'http.response.status_code', operator: 'gt' as const, value: 500 },
    result: '(ctx.http?.response?.status_code !== null && ctx.http?.response?.status_code > 500)',
  },
  {
    condition: { field: 'http.response.status_code', operator: 'gte' as const, value: 500 },
    result: '(ctx.http?.response?.status_code !== null && ctx.http?.response?.status_code >= 500)',
  },
  {
    condition: { field: 'log.logger', operator: 'startsWith' as const, value: 'nginx' },
    result: '(ctx.log?.logger !== null && ctx.log?.logger.startsWith("nginx"))',
  },
  {
    condition: { field: 'log.logger', operator: 'endsWith' as const, value: 'proxy' },
    result: '(ctx.log?.logger !== null && ctx.log?.logger.endsWith("proxy"))',
  },
  {
    condition: { field: 'log.logger', operator: 'contains' as const, value: 'proxy' },
    result: '(ctx.log?.logger !== null && ctx.log?.logger.contains("proxy"))',
  },
  {
    condition: { field: 'log.logger', operator: 'exists' as const },
    result: 'ctx.log?.logger !== null',
  },
  {
    condition: { field: 'log.logger', operator: 'notExists' as const },
    result: 'ctx.log?.logger == null',
  },
];

describe('conditionToPainless', () => {
  describe('conditionToStatement', () => {
    describe('operators', () => {
      operatorConditionAndResults.forEach((setup) => {
        test(`${setup.condition.operator}`, () => {
          expect(conditionToStatement(setup.condition)).toEqual(setup.result);
        });
      });
    });

    describe('and', () => {
      test('simple', () => {
        const condition = {
          and: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            '(ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy") && (ctx.log?.level !== null && ctx.log?.level == "error")'
          )
        );
      });
    });

    describe('or', () => {
      test('simple', () => {
        const condition = {
          or: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            '(ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy") || (ctx.log?.level !== null && ctx.log?.level == "error")'
          )
        );
      });
    });

    describe('nested', () => {
      test('and with a filter and or with 2 filters', () => {
        const condition = {
          and: [
            { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
            {
              or: [
                { field: 'log.level', operator: 'eq' as const, value: 'error' },
                { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
              ],
            },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            '(ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy") && ((ctx.log?.level !== null && ctx.log?.level == "error") || (ctx.log?.level !== null && ctx.log?.level == "ERROR"))'
          )
        );
      });
      test('and with 2 or with filters', () => {
        const condition = {
          and: [
            {
              or: [
                { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
                { field: 'service.name', operator: 'eq' as const, value: 'nginx' },
              ],
            },
            {
              or: [
                { field: 'log.level', operator: 'eq' as const, value: 'error' },
                { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
              ],
            },
          ],
        };
        expect(
          expect(conditionToStatement(condition)).toEqual(
            '((ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy") || (ctx.service?.name !== null && ctx.service?.name == "nginx")) && ((ctx.log?.level !== null && ctx.log?.level == "error") || (ctx.log?.level !== null && ctx.log?.level == "ERROR"))'
          )
        );
      });
    });
  });

  test('wrapped with type checks for uinary conditions', () => {
    const condition = { field: 'log', operator: 'exists' as const };
    expect(conditionToPainless(condition)).toEqual(`try {
  if (ctx.log !== null) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`);
  });

  test('wrapped with typechecks and try/catch', () => {
    const condition = {
      and: [
        { field: 'log.logger', operator: 'eq' as const, value: 'nginx_proxy' },
        {
          or: [
            { field: 'log.level', operator: 'eq' as const, value: 'error' },
            { field: 'log.level', operator: 'eq' as const, value: 'ERROR' },
          ],
        },
      ],
    };
    expect(
      expect(conditionToPainless(condition))
        .toEqual(`if (ctx.log?.logger instanceof Map || ctx.log?.level instanceof Map) {
  return false;
}
try {
  if ((ctx.log?.logger !== null && ctx.log?.logger == "nginx_proxy") && ((ctx.log?.level !== null && ctx.log?.level == "error") || (ctx.log?.level !== null && ctx.log?.level == "ERROR"))) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`)
    );
  });
});
