/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toKueryFilterFormat, mergeKueries, toAnyOfKuery } from './kuery_utils';

describe('toKueryFilterFormat', () => {
  it('returns a single value', () => {
    expect(toKueryFilterFormat('key', ['foo'])).toEqual(`key : "foo"`);
  });

  it('returns multiple values default separator', () => {
    expect(toKueryFilterFormat('key', ['foo', 'bar', 'baz'])).toEqual(
      `key : "foo" OR key : "bar" OR key : "baz"`
    );
  });

  it('returns multiple values custom separator', () => {
    expect(toKueryFilterFormat('key', ['foo', 'bar', 'baz'], 'AND')).toEqual(
      `key : "foo" AND key : "bar" AND key : "baz"`
    );
  });

  it('return empty string when no hostname', () => {
    expect(toKueryFilterFormat('key', [])).toEqual('');
  });

  describe('mergeKueries', () => {
    it('returns empty string when both kueries are empty', () => {
      expect(mergeKueries(['', ''])).toEqual('');
    });

    it('returns only first kuery when second is empty', () => {
      expect(mergeKueries(['host.name: "foo"', ''])).toEqual('host.name: "foo"');
    });

    it('returns second kuery when first is empty', () => {
      expect(mergeKueries(['', 'host.name: "foo"'])).toEqual('host.name: "foo"');
    });

    it('returns merged kueries with default separator', () => {
      expect(mergeKueries(['host.name: "foo" OR host.name: "bar"', 'process.id: "1"'])).toEqual(
        'host.name: "foo" OR host.name: "bar" AND process.id: "1"'
      );
    });

    it('uses custom separator', () => {
      expect(mergeKueries(['host.name: "foo"', 'process.id: "1"'], 'OR')).toEqual(
        'host.name: "foo" OR process.id: "1"'
      );
    });
  });
});

describe('toAnyOfKuery', () => {
  it('returns an empty string when no pair has a value', () => {
    expect(
      toAnyOfKuery([
        ['span.id', undefined],
        ['transaction.id', ''],
      ])
    ).toEqual('');
  });

  it('returns a single unwrapped clause when only one pair has a value', () => {
    expect(
      toAnyOfKuery([
        ['span.id', undefined],
        ['transaction.id', 'tx-1'],
      ])
    ).toEqual('transaction.id : "tx-1"');
  });

  it('ORs and parenthesises multiple clauses', () => {
    expect(
      toAnyOfKuery([
        ['span.id', 'doc-1'],
        ['transaction.id', 'doc-1'],
      ])
    ).toEqual('(span.id : "doc-1" or transaction.id : "doc-1")');
  });

  it('keeps the declared order and preserves differing values', () => {
    expect(
      toAnyOfKuery([
        ['transaction.id', 'tx-1'],
        ['span.id', 'span-1'],
      ])
    ).toEqual('(transaction.id : "tx-1" or span.id : "span-1")');
  });
});
