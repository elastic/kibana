/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlQuery, computeHasMetadataOperator } from './esql_validator';

import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

jest.mock('@kbn/securitysolution-utils', () => ({ computeIsESQLQueryAggregating: jest.fn() }));

const computeIsESQLQueryAggregatingMock = computeIsESQLQueryAggregating as jest.Mock;

describe('computeHasMetadataOperator', () => {
  it('should be false if query does not have operator', () => {
    expect(computeHasMetadataOperator('from test*')).toBe(false);
    expect(computeHasMetadataOperator('from test* [metadata]')).toBe(false);
    expect(computeHasMetadataOperator('from test* [metadata id]')).toBe(false);
    expect(computeHasMetadataOperator('from metadata*')).toBe(false);
    expect(computeHasMetadataOperator('from test* | keep metadata')).toBe(false);
    expect(computeHasMetadataOperator('from test* | eval x="[metadata _id]"')).toBe(false);
  });
  it('should be true if query has operator', () => {
    expect(computeHasMetadataOperator('from test* metadata _id')).toBe(true);
    expect(computeHasMetadataOperator('from test* metadata _id, _index')).toBe(true);
    expect(computeHasMetadataOperator('from test* metadata _index, _id')).toBe(true);
    expect(computeHasMetadataOperator('from test*  metadata _id ')).toBe(true);
    expect(computeHasMetadataOperator('from test*  metadata _id | limit 10')).toBe(true);
    expect(
      computeHasMetadataOperator(`from packetbeat* metadata 

        _id
        | limit 100`)
    ).toBe(true);

    // still validates deprecated square bracket syntax
    expect(computeHasMetadataOperator('from test* [metadata _id]')).toBe(true);
    expect(computeHasMetadataOperator('from test* [metadata _id, _index]')).toBe(true);
    expect(computeHasMetadataOperator('from test* [metadata _index, _id]')).toBe(true);
    expect(computeHasMetadataOperator('from test* [ metadata _id ]')).toBe(true);
    expect(computeHasMetadataOperator('from test* [   metadata _id] ')).toBe(true);
    expect(computeHasMetadataOperator('from test* [ metadata _id] | limit 10')).toBe(true);
    expect(
      computeHasMetadataOperator(`from packetbeat* [metadata 

        _id ]
        | limit 100`)
    ).toBe(true);
  });
});

describe('parseEsqlQuery', () => {
  it('returns isMissingMetadataOperator true when query is not aggregating and does not have metadata operator', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValueOnce(false);

    expect(parseEsqlQuery('from test*')).toEqual({
      isEsqlQueryAggregating: false,
      isMissingMetadataOperator: true,
    });
  });

  it('returns isMissingMetadataOperator false when query is not aggregating and has metadata operator', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValueOnce(false);

    expect(parseEsqlQuery('from test* metadata _id')).toEqual({
      isEsqlQueryAggregating: false,
      isMissingMetadataOperator: false,
    });
  });

  it('returns isMissingMetadataOperator false when query is aggregating', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(true);

    expect(parseEsqlQuery('from test*')).toEqual({
      isEsqlQueryAggregating: true,
      isMissingMetadataOperator: false,
    });

    expect(parseEsqlQuery('from test* metadata _id')).toEqual({
      isEsqlQueryAggregating: true,
      isMissingMetadataOperator: false,
    });
  });
});
