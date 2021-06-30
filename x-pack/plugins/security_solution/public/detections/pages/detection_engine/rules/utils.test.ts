/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBreadcrumbs } from './utils';

const getUrlForAppMock = (appId: string, options?: { path?: string; absolute?: boolean }) =>
  `${appId}${options?.path ?? ''}`;

describe('getBreadcrumbs', () => {
  it('Does not render for incorrect params', () => {
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
    ).toEqual([]);
  });
});
