/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnsupportedKueryFields } from './get_unsupported_kuery_fields';

describe('getUnsupportedKueryFields', () => {
  it('returns an empty array for an empty kuery', () => {
    expect(getUnsupportedKueryFields('')).toEqual([]);
  });

  it('returns an empty array when only span fields are referenced', () => {
    expect(getUnsupportedKueryFields('span.name : "GET /api"')).toEqual([]);
    expect(
      getUnsupportedKueryFields('span.destination.service.resource : "elasticsearch"')
    ).toEqual([]);
  });

  it('treats event.outcome as supported', () => {
    expect(getUnsupportedKueryFields('event.outcome : "failure"')).toEqual([]);
  });

  it('returns fields that the operations query cannot filter on', () => {
    expect(getUnsupportedKueryFields('url.full : *')).toEqual(['url.full']);
    expect(getUnsupportedKueryFields('transaction.name : "foo"')).toEqual(['transaction.name']);
  });

  it('returns only the unsupported subset when mixing supported and unsupported fields', () => {
    expect(getUnsupportedKueryFields('span.name : "GET" and url.full : *')).toEqual(['url.full']);
  });

  it('deduplicates repeated unsupported fields', () => {
    expect(getUnsupportedKueryFields('url.full : "a" or url.full : "b"')).toEqual(['url.full']);
  });

  it('returns an empty array for invalid KQL rather than throwing', () => {
    expect(getUnsupportedKueryFields('this is : : not valid ::')).toEqual([]);
  });
});
