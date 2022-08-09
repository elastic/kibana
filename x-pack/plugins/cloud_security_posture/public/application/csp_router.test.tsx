/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRoutesFromMapping, addSpyRouteComponentToRoute } from './csp_router';
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import type { RouteComponentProps } from 'react-router-dom';
import type { CloudSecurityPosturePageId } from '../common/navigation/types';
import { createPageNavigationItemFixture } from '../test/fixtures/navigation_item';

const chance = new Chance();
const DummyComponent = () => null;

describe('getRoutesFromMapping', () => {
  it('should map routes', () => {
    const pageId = chance.word();
    const navigationItems = { [pageId]: createPageNavigationItemFixture() };
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
    const navigationItems = { [pageId]: createPageNavigationItemFixture({ disabled: true }) };
    const routesMapping = { [pageId]: DummyComponent };
    const routes = getRoutesFromMapping(navigationItems, routesMapping);

    expect(routes).toHaveLength(0);
  });
});

describe('addSpyRouteComponentToRoute', () => {
  it('should add the spy route component to a csp route', () => {
    const pageNameForRoute = chance.pickone<CloudSecurityPosturePageId>([
      'cloud_security_posture-dashboard',
      'cloud_security_posture-findings',
      'cloud_security_posture-benchmarks',
      'cloud_security_posture-rules',
    ]);

    // Create a mock SpyRoute component that renders the page name as a test ID
    const SpyRouteMock = ({ pageName }: { pageName?: string }) => <div data-test-subj={pageName} />;
    const mockRouteComponentTestId = chance.word();
    const MockRouteComponent = () => <div data-test-subj={mockRouteComponentTestId} />;
    const route = { id: pageNameForRoute, path: chance.word(), component: MockRouteComponent };
    const routeWithSpyRoute = addSpyRouteComponentToRoute(route, SpyRouteMock);

    expect(routeWithSpyRoute.render).toEqual(expect.any(Function));

    render(<div>{routeWithSpyRoute.render!({} as unknown as RouteComponentProps)}</div>);

    expect(routeWithSpyRoute.component).toBeUndefined();
    expect(screen.getByTestId(mockRouteComponentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(pageNameForRoute)).toBeInTheDocument();
  });
});
