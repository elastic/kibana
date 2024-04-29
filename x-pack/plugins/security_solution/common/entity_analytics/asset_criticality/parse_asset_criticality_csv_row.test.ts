/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAssetCriticalityCsvRow } from './parse_asset_criticality_csv_row';

describe('parseAssetCriticalityCsvRow', () => {
  it('should return valid false if the row has no columns', () => {
    const result = parseAssetCriticalityCsvRow([]);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Expected 3 columns, got 0"`);
  });

  it('should return valid false if the row has 2 columns', () => {
    const result = parseAssetCriticalityCsvRow(['host', 'host-1']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Expected 3 columns, got 2"`);
  });

  it('should return valid false if the row has 4 columns', () => {
    const result = parseAssetCriticalityCsvRow(['host', 'host-1', 'low_impact', 'extra']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Expected 3 columns, got 4"`);
  });

  it('should return valid false if the entity type is missing', () => {
    const result = parseAssetCriticalityCsvRow(['', 'host-1', 'low_impact']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Missing entity type"`);
  });

  it('should return valid false if the entity type is invalid', () => {
    const result = parseAssetCriticalityCsvRow(['invalid', 'host-1', 'low_impact']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(
      `"Invalid entity type \\"invalid\\", expected host or user"`
    );
  });

  it('should return valid false if the entity type is invalid and only log 1000 characters', () => {
    const invalidEntityType = 'x'.repeat(1001);
    const result = parseAssetCriticalityCsvRow([invalidEntityType, 'host-1', 'low_impact']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(
      `"Invalid entity type \\"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...\\", expected host or user"`
    );
  });

  it('should return valid false if the ID is missing', () => {
    const result = parseAssetCriticalityCsvRow(['host', '', 'low_impact']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Missing identifier"`);
  });

  it('should return valid false if the criticality level is missing', () => {
    const result = parseAssetCriticalityCsvRow(['host', 'host-1', '']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(`"Missing criticality level"`);
  });

  it('should return valid false if the criticality level is invalid', () => {
    const result = parseAssetCriticalityCsvRow(['host', 'host-1', 'invalid']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(
      `"Invalid criticality level \\"invalid\\", expected one of extreme_impact, high_impact, medium_impact, low_impact"`
    );
  });

  it('should return valid false if the criticality level is invalid and only log 1000 characters', () => {
    const invalidCriticalityLevel = 'x'.repeat(1001);
    const result = parseAssetCriticalityCsvRow(['host', 'host-1', invalidCriticalityLevel]);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(
      `"Invalid criticality level \\"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...\\", expected one of extreme_impact, high_impact, medium_impact, low_impact"`
    );
  });

  it('should return valid false if the ID is too long', () => {
    const idValue = 'x'.repeat(1001);
    const result = parseAssetCriticalityCsvRow(['host', idValue, 'low_impact']);
    expect(result.valid).toBe(false);

    // @ts-ignore result can now only be InvalidRecord
    expect(result.error).toMatchInlineSnapshot(
      `"Identifier is too long, expected less than 1000 characters, got 1001"`
    );
  });

  it('should return the parsed row', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'low_impact'])).toEqual({
      valid: true,
      record: {
        idField: 'host.name',
        idValue: 'host-1',
        criticalityLevel: 'low_impact',
      },
    });
  });

  it('should return the parsed row if criticality level is the wrong case', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'LOW_IMPACT'])).toEqual({
      valid: true,
      record: {
        idField: 'host.name',
        idValue: 'host-1',
        criticalityLevel: 'low_impact',
      },
    });
  });
});
