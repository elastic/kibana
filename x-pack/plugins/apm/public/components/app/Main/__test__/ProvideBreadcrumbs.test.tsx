/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { BreadcrumbRoute, getBreadcrumbs } from '../ProvideBreadcrumbs';
import { RouteName } from '../route_config/route_names';

describe('getBreadcrumbs', () => {
  const getTestRoutes = (): BreadcrumbRoute[] => [
    { path: '/a', exact: true, breadcrumb: 'A', name: RouteName.HOME },
    {
      path: '/a/ignored',
      exact: true,
      breadcrumb: 'Ignored Route',
      name: RouteName.METRICS
    },
    {
      path: '/a/:letter',
      exact: true,
      name: RouteName.SERVICE,
      breadcrumb: ({ match }) => `Second level: ${match.params.letter}`
    },
    {
      path: '/a/:letter/c',
      exact: true,
      name: RouteName.ERRORS,
      breadcrumb: ({ match }) => `Third level: ${match.params.letter}`
    }
  ];

  const getLocation = () =>
    ({
      pathname: '/a/b/c/'
    } as Location);

  it('should return a set of matching breadcrumbs for a given path', () => {
    const breadcrumbs = getBreadcrumbs({
      location: getLocation(),
      routes: getTestRoutes()
    });

    expect(breadcrumbs.map(b => b.value)).toMatchInlineSnapshot(`
Array [
  "A",
  "Second level: b",
  "Third level: b",
]
`);
  });

  it('should skip breadcrumbs if breadcrumb is null', () => {
    const location = getLocation();
    const routes = getTestRoutes();

    routes[2].breadcrumb = null;

    const breadcrumbs = getBreadcrumbs({
      location,
      routes
    });

    expect(breadcrumbs.map(b => b.value)).toMatchInlineSnapshot(`
Array [
  "A",
  "Third level: b",
]
`);
  });

  it('should skip breadcrumbs if breadcrumb key is missing', () => {
    const location = getLocation();
    const routes = getTestRoutes();

    delete routes[2].breadcrumb;

    const breadcrumbs = getBreadcrumbs({ location, routes });

    expect(breadcrumbs.map(b => b.value)).toMatchInlineSnapshot(`
Array [
  "A",
  "Third level: b",
]
`);
  });

  it('should produce matching breadcrumbs even if the pathname has a query string appended', () => {
    const location = getLocation();
    const routes = getTestRoutes();

    location.pathname += '?some=thing';

    const breadcrumbs = getBreadcrumbs({
      location,
      routes
    });

    expect(breadcrumbs.map(b => b.value)).toMatchInlineSnapshot(`
Array [
  "A",
  "Second level: b",
  "Third level: b",
]
`);
  });
});
