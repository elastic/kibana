/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectKqlFilter } from './common';

describe('getSavedObjectKqlFilter', () => {
  it('returns empty string if no values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags' })).toBe('');
  });

  it('returns KQL string if values are provided', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm' })).toBe(
      'synthetics-monitor.attributes.tags:"apm"'
    );
  });

  it('searches at root when specified', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: 'apm', searchAtRoot: true })).toBe(
      'tags:"apm"'
    );
  });

  it('handles array values', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("apm" OR "synthetics")'
    );
  });

  it('escapes quotes', () => {
    expect(getSavedObjectKqlFilter({ field: 'tags', values: ['"apm', 'synthetics'] })).toBe(
      'synthetics-monitor.attributes.tags:("\\"apm" OR "synthetics")'
    );
  });
});
