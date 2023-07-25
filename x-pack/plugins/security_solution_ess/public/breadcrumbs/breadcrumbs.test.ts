/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { emptyLastBreadcrumbUrl } from './breadcrumbs';

describe('emptyLastBreadcrumbUrl', () => {
  it('should empty the URL and onClick function of the last breadcrumb', () => {
    const breadcrumbs: ChromeBreadcrumb[] = [
      { text: 'Home', href: '/home', onClick: () => {} },
      { text: 'Breadcrumb 1', href: '/bc1', onClick: () => {} },
      { text: 'Last Breadcrumbs', href: '/last_bc', onClick: () => {} },
    ];

    const expectedBreadcrumbs = [
      { text: 'Home', href: '/home', onClick: breadcrumbs[0].onClick },
      { text: 'Breadcrumb 1', href: '/bc1', onClick: breadcrumbs[1].onClick },
      { text: 'Last Breadcrumbs', href: '', onClick: undefined },
    ];

    expect(emptyLastBreadcrumbUrl(breadcrumbs)).toEqual(expectedBreadcrumbs);
  });

  it('should return the original breadcrumbs if the input is empty', () => {
    const emptyBreadcrumbs: ChromeBreadcrumb[] = [];

    expect(emptyLastBreadcrumbUrl(emptyBreadcrumbs)).toEqual(emptyBreadcrumbs);
  });
});
