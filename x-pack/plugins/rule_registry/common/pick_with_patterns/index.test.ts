/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickWithPatterns } from '.';

describe('pickWithPatterns', () => {
  const fieldMap = {
    'event.category': { type: 'keyword' },
    'event.kind': { type: 'keyword' },
    'destination.bytes': {
      type: 'long',
      array: false,
      required: false,
    },
    'destination.domain': {
      type: 'keyword',
      array: false,
      required: false,
    },
    'destination.geo.city_name': {
      type: 'keyword',
      array: false,
      required: false,
    },
  } as const;

  it('picks a single field', () => {
    expect(Object.keys(pickWithPatterns(fieldMap, 'event.category'))).toEqual(['event.category']);
  });

  it('picks event fields', () => {
    expect(Object.keys(pickWithPatterns(fieldMap, 'event.*')).sort()).toEqual([
      'event.category',
      'event.kind',
    ]);
  });

  it('picks destination.geo fields', () => {
    expect(Object.keys(pickWithPatterns(fieldMap, 'destination.geo.*')).sort()).toEqual([
      'destination.geo.city_name',
    ]);
  });

  it('picks all destination fields', () => {
    expect(Object.keys(pickWithPatterns(fieldMap, 'destination.*')).sort()).toEqual([
      'destination.bytes',
      'destination.domain',
      'destination.geo.city_name',
    ]);
  });

  it('picks fields from multiple patterns', () => {
    expect(
      Object.keys(pickWithPatterns(fieldMap, 'destination.geo.*', 'event.category')).sort()
    ).toEqual(['destination.geo.city_name', 'event.category']);
  });

  it('picks all fields', () => {
    expect(Object.keys(pickWithPatterns(fieldMap, '*')).sort()).toEqual([
      'destination.bytes',
      'destination.domain',
      'destination.geo.city_name',
      'event.category',
      'event.kind',
    ]);
  });
});
