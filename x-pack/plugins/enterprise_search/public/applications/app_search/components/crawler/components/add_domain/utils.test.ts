/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { extractDomainAndEntryPointFromUrl } from './utils';

describe('extractDomainAndEntryPointFromUrl', () => {
  it('extracts a provided entry point and domain', () => {
    expect(extractDomainAndEntryPointFromUrl('https://elastic.co/guide')).toEqual({
      domain: 'https://elastic.co',
      entryPoint: '/guide',
    });
  });

  it('provides a default entry point if there is only a domain', () => {
    expect(extractDomainAndEntryPointFromUrl('https://elastic.co')).toEqual({
      domain: 'https://elastic.co',
      entryPoint: '/',
    });
  });
});
