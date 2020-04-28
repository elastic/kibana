/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBreadcrumbs } from './utils';

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
        []
      )
    ).toEqual([{ href: '#/link-to/detections', text: 'Detections' }]);
  });
});
