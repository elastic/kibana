/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, esql } from '@elastic/esql';
import { conditionToESQLFilterAst } from './condition_to_esql_filter';
import type { Condition } from '@kbn/streamlang';

const print = (condition: Condition): string =>
  BasicPrettyPrinter.print(conditionToESQLFilterAst(condition));

describe('conditionToESQLFilterAst', () => {
  it('emits bare positive leaves', () => {
    expect(print({ field: 'service.name', eq: 'checkout' })).toBe('`service.name` == "checkout"');
    expect(print({ field: 'count', range: { gt: 1, lte: 5 } })).toBe('count > 1 AND count <= 5');
    expect(print({ field: 'message', contains: 'Error' })).toBe(
      'CONTAINS(TO_LOWER(message), "error")'
    );
  });

  it('keeps missing fields for neq', () => {
    expect(print({ field: 'status', neq: 'deleted' })).toBe(
      '(status != "deleted" OR status IS NULL)'
    );
  });

  it('pushes NOT to the leaves, keeping missing fields', () => {
    expect(print({ not: { field: 'service.name', eq: 'checkout' } })).toBe(
      '(`service.name` != "checkout" OR `service.name` IS NULL)'
    );
    expect(print({ not: { field: 'status', neq: 'deleted' } })).toBe('status == "deleted"');
    expect(print({ not: { field: 'count', range: { gt: 1, lte: 5 } } })).toBe(
      '(count <= 1 OR count > 5 OR count IS NULL)'
    );
    expect(print({ not: { field: 'message', contains: 'error' } })).toBe(
      '(NOT CONTAINS(TO_LOWER(message), "error") OR message IS NULL)'
    );
    expect(print({ not: { field: 'host', exists: true } })).toBe('host IS NULL');
  });

  it('applies De Morgan to and/or', () => {
    expect(
      print({
        not: {
          or: [
            { field: 'cluster_type', eq: 'apm' },
            { field: 'ec_container_kind', eq: 'apm' },
          ],
        },
      })
    ).toBe(
      '(cluster_type != "apm" OR cluster_type IS NULL) AND (ec_container_kind != "apm" OR ec_container_kind IS NULL)'
    );
    expect(
      print({
        not: {
          and: [
            { field: 'a', eq: 1 },
            { field: 'b', eq: 2 },
          ],
        },
      })
    ).toBe('(a != 1 OR a IS NULL OR b != 2 OR b IS NULL)');
  });

  it('negates always/never', () => {
    expect(print({ not: { always: {} } })).toBe('FALSE');
    expect(print({ not: { never: {} } })).toBe('TRUE');
  });

  it('keeps a top-level OR grouped when spliced into an esql template', () => {
    const where = conditionToESQLFilterAst({ not: { field: 'a', eq: 'x' } });

    expect(BasicPrettyPrinter.print(esql.exp`KQL("foo") AND ${where}`)).toBe(
      'KQL("foo") AND (a != "x" OR a IS NULL)'
    );
  });
});
