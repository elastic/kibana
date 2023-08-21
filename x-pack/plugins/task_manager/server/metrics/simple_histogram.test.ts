/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleHistogram } from './simple_histogram';

describe('SimpleHistogram', () => {
  test('should throw error when bucketSize is greater than range', () => {
    expect(() => {
      new SimpleHistogram(10, 100);
    }).toThrowErrorMatchingInlineSnapshot(`"bucket size cannot be greater than value range"`);
  });

  test('should correctly initialize when bucketSize evenly divides range', () => {
    const histogram = new SimpleHistogram(100, 10);
    expect(histogram.get()).toEqual([
      { value: 10, count: 0 },
      { value: 20, count: 0 },
      { value: 30, count: 0 },
      { value: 40, count: 0 },
      { value: 50, count: 0 },
      { value: 60, count: 0 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);
  });

  test('should correctly initialize when bucketSize does not evenly divides range', () => {
    const histogram = new SimpleHistogram(100, 7);
    expect(histogram.get()).toEqual([
      { value: 7, count: 0 },
      { value: 14, count: 0 },
      { value: 21, count: 0 },
      { value: 28, count: 0 },
      { value: 35, count: 0 },
      { value: 42, count: 0 },
      { value: 49, count: 0 },
      { value: 56, count: 0 },
      { value: 63, count: 0 },
      { value: 70, count: 0 },
      { value: 77, count: 0 },
      { value: 84, count: 0 },
      { value: 91, count: 0 },
      { value: 98, count: 0 },
      { value: 105, count: 0 },
    ]);
  });

  test('should correctly record values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 1 },
      { value: 90, count: 0 },
      { value: 100, count: 1 },
    ]);
  });

  test('should ignore values less than 0 and greater than max', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    const hist1 = histogram.get();

    histogram.record(-1);
    histogram.record(200);

    expect(histogram.get()).toEqual(hist1);
  });

  test('should correctly reset values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 1 },
      { value: 90, count: 0 },
      { value: 100, count: 1 },
    ]);

    histogram.reset();

    expect(histogram.get()).toEqual([
      { value: 10, count: 0 },
      { value: 20, count: 0 },
      { value: 30, count: 0 },
      { value: 40, count: 0 },
      { value: 50, count: 0 },
      { value: 60, count: 0 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);
  });

  test('should correctly truncate zero values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(33);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);

    expect(histogram.get(true)).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
    ]);
  });

  test('should correctly truncate zero values when all values are zero', () => {
    const histogram = new SimpleHistogram(100, 10);

    expect(histogram.get(true)).toEqual([]);
  });
});
