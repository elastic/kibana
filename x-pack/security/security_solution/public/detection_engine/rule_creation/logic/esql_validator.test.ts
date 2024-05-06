/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeHasMetadataOperator } from './esql_validator';

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
