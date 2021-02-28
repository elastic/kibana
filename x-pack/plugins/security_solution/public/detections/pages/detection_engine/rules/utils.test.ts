/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBreadcrumbs, normalizeThresholdField } from './utils';

const getUrlForAppMock = (appId: string, options?: { path?: string; absolute?: boolean }) =>
  `${appId}${options?.path ?? ''}`;

describe('getBreadcrumbs', () => {
  it('returns default value for incorrect params', () => {
    expect(
      getBreadcrumbs(
        {
          pageName: 'pageName',
          detailName: 'detailName',
          tabName: undefined,
          search: '',
          pathName: 'pathName',
        },
        [],
        getUrlForAppMock
      )
    ).toEqual([{ href: 'securitySolution:detections', text: 'Detections' }]);
  });
});

describe('normalizeThresholdField', () => {
  it('converts a string to a string array', () => {
    expect(normalizeThresholdField('host.name')).toEqual(['host.name']);
  });
  it('returns a string array when a string array is passed in', () => {
    expect(normalizeThresholdField(['host.name'])).toEqual(['host.name']);
  });
  it('converts undefined to an empty array', () => {
    expect(normalizeThresholdField(undefined)).toEqual([]);
  });
  it('converts null to an empty array', () => {
    expect(normalizeThresholdField(null)).toEqual([]);
  });
  it('converts an empty string to an empty array', () => {
    expect(normalizeThresholdField('')).toEqual([]);
  });
});
