/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectsKqlFilter } from './common';

describe('getKqlFilter', () => {
  it('returns empty string if no values are provided', () => {
    expect(getSavedObjectsKqlFilter({ field: 'tags' })).toBe('');
  });

  it('returns KQL string if values are provided', () => {
    expect(getSavedObjectsKqlFilter({ field: 'tags', values: 'apm' })).toBe(
      'synthetics-monitor.attributes.tags:"apm"'
    );
  });

  it('searches at root when specified', () => {
    expect(getSavedObjectsKqlFilter({ field: 'tags', values: 'apm', searchAtRoot: true })).toBe(
      'tags:"apm"'
    );
  });

  it('handles array values', () => {
    expect(getSavedObjectsKqlFilter({ field: 'tags', values: ['apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("apm" OR "synthetics")'
    );
  });

  it('escapes quotes', () => {
    expect(getSavedObjectsKqlFilter({ field: 'tags', values: ['"apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("\\"apm" OR "synthetics")'
    );
  });
});
