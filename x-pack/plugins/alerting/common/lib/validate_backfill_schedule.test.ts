/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateBackfillSchedule } from './validate_backfill_schedule';

describe('validateBackfillSchedule', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-11-16T08:00:00.000Z'));
  });
  afterAll(() => jest.useRealTimers());

  test('validates valid start date', () => {
    expect(validateBackfillSchedule('2023-10-16T08:00:00.000Z')).toBeUndefined();
  });

  test('validates valid end date', () => {
    expect(
      validateBackfillSchedule('2023-10-16T08:00:00.000Z', '2023-10-17T08:00:00.000Z')
    ).toBeUndefined();
  });

  test('returns error if start date is not a valid date', () => {
    expect(validateBackfillSchedule('foo')).toMatchInlineSnapshot(
      `"Backfill start must be valid date"`
    );
  });

  test('returns error if end date is not a valid date', () => {
    expect(validateBackfillSchedule('2023-10-16T08:00:00.000Z', 'foo')).toMatchInlineSnapshot(
      `"Backfill end must be valid date"`
    );
  });

  test('returns error if start date is too far in the past', () => {
    expect(validateBackfillSchedule('2023-08-18T07:59:59.999Z')).toMatchInlineSnapshot(
      `"Backfill cannot look back more than 90 days"`
    );
  });

  test('returns error if end date is less than or equal to start date', () => {
    expect(
      validateBackfillSchedule('2023-10-16T08:00:00.000Z', '2023-10-16T08:00:00.000Z')
    ).toMatchInlineSnapshot(`"Backfill end must be greater than backfill start"`);
    expect(
      validateBackfillSchedule('2023-10-16T08:00:00.000Z', '2023-10-15T08:00:00.000Z')
    ).toMatchInlineSnapshot(`"Backfill end must be greater than backfill start"`);
  });

  test('returns error if start date is greater than current date', () => {
    expect(validateBackfillSchedule('2023-11-16T08:00:00.001Z')).toMatchInlineSnapshot(
      `"Backfill cannot be scheduled for the future"`
    );
  });

  test('returns error if end date is greater than current date', () => {
    expect(
      validateBackfillSchedule('2023-10-16T08:00:00.000Z', '2023-11-16T08:00:00.001Z')
    ).toMatchInlineSnapshot(`"Backfill cannot be scheduled for the future"`);
  });
});
