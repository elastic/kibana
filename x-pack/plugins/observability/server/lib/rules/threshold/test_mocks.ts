/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const bucketsA = (from: number) => [
  {
    doc_count: null,
    aggregatedValue: { value: null, values: [{ key: 95.0, value: null }] },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5, values: [{ key: 95.0, value: 0.5 }] },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 1.0, values: [{ key: 95.0, value: 1.0 }] },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 1.0, values: [{ key: 95.0, value: 1.0 }] },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];

const bucketsB = (from: number) => [
  {
    doc_count: 0,
    aggregatedValue: { value: null, values: [{ key: 99.0, value: null }] },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 4,
    aggregatedValue: { value: 2.5, values: [{ key: 99.0, value: 2.5 }] },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 5,
    aggregatedValue: { value: 3.5, values: [{ key: 99.0, value: 3.5 }] },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 3, values: [{ key: 99.0, value: 3 }] },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];

const bucketsC = (from: number) => [
  {
    doc_count: 0,
    aggregatedValue: { value: null },
    from_as_string: new Date(from).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 60000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 120000).toISOString(),
  },
  {
    doc_count: 2,
    aggregatedValue: { value: 0.5 },
    from_as_string: new Date(from + 180000).toISOString(),
  },
  {
    doc_count: 3,
    aggregatedValue: { value: 16 },
    from_as_string: new Date(from + 240000).toISOString(),
  },
  {
    doc_count: 1,
    aggregatedValue: { value: 3 },
    from_as_string: new Date(from + 300000).toISOString(),
  },
];
