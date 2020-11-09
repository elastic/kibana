/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBreadcrumbs } from './get_breadcrumbs';

jest.mock('../../../kibana_services', () => {});
jest.mock('../../../render_app', () => {});

const getHasUnsavedChanges = () => {
  return false;
};

test('should get breadcrumbs "Maps / mymap"', () => {
  const breadcrumbs = getBreadcrumbs({
    pageTitle: 'mymap',
    getHasUnsavedChanges,
    isByValue: false,
  });
  expect(breadcrumbs.length).toBe(2);
  expect(breadcrumbs[0].text).toBe('Maps');
  expect(breadcrumbs[1].text).toBe('mymap');
});

test('should get breadcrumbs "Dashboard / mymap" with originatingApp and by value', () => {
  const breadcrumbs = getBreadcrumbs({
    pageTitle: 'mymap',
    isByValue: true,
    getHasUnsavedChanges,
    originatingApp: 'dashboardId',
    getAppNameFromId: (appId) => {
      return 'Dashboard';
    },
  });
  expect(breadcrumbs.length).toBe(2);
  expect(breadcrumbs[0].text).toBe('Dashboard');
  expect(breadcrumbs[1].text).toBe('mymap');
});

test('should get breadcrumbs "Dashboard / Maps / mymap" with originatingApp and not by value', () => {
  const breadcrumbs = getBreadcrumbs({
    pageTitle: 'mymap',
    isByValue: false,
    getHasUnsavedChanges,
    originatingApp: 'dashboardId',
    getAppNameFromId: (appId) => {
      return 'Dashboard';
    },
  });
  expect(breadcrumbs.length).toBe(3);
  expect(breadcrumbs[0].text).toBe('Dashboard');
  expect(breadcrumbs[1].text).toBe('Maps');
  expect(breadcrumbs[2].text).toBe('mymap');
});
