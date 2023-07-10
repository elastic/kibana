/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { BreadcrumbsNav } from './common/breadcrumbs';
import type { NavigationLink } from './common/links/types';

const setupMock = () => ({
  resolver: jest.fn(),
});

const startMock = () => ({
  getNavLinks$: jest.fn(() => new BehaviorSubject<NavigationLink[]>([])),
  setIsSidebarEnabled: jest.fn(),
  setGetStartedPage: jest.fn(),
  getBreadcrumbsNav$: jest.fn(
    () => new BehaviorSubject<BreadcrumbsNav>({ leading: [], trailing: [] })
  ),
});

export const securitySolutionMock = {
  createSetup: setupMock,
  createStart: startMock,
};
