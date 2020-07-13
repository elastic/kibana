/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBreadcrumbs } from './utils';

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
    ).toEqual([{ href: 'securitySolution:detections', text: 'Detection alerts' }]);
  });
});
