/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { createNavigationItemFixture } from '../test/fixtures/navigation_item';
import { getRoutesFromMapping } from './app';

const chance = new Chance();
const DummyComponent = () => null;

describe('getRoutesFromMapping', () => {
  it('should map routes', () => {
    const pageId = chance.word();
    const navigationItems = { [pageId]: createNavigationItemFixture() };
    const routesMapping = { [pageId]: DummyComponent };
    const routes = getRoutesFromMapping(navigationItems, routesMapping);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      path: navigationItems[pageId].path,
      component: DummyComponent,
    });
  });

  it('should not map routes where the navigation item is disabled', () => {
    const pageId = chance.word();
    const navigationItems = { [pageId]: createNavigationItemFixture({ disabled: true }) };
    const routesMapping = { [pageId]: DummyComponent };
    const routes = getRoutesFromMapping(navigationItems, routesMapping);

    expect(routes).toHaveLength(0);
  });
});
