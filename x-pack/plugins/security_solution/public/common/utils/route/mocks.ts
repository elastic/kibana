/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '../../../app/types';
import type { RouteSpyState } from './types';

type Action = 'PUSH' | 'POP' | 'REPLACE';

const pop: Action = 'POP';

const generateDefaultLocationMock = () => ({
  hash: '',
  pathname: '/hosts',
  search: '',
  state: '',
});

export const generateHistoryMock = () => ({
  action: pop,
  block: jest.fn(),
  createHref: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  length: 2,
  listen: jest.fn(),
  location: generateDefaultLocationMock(),
  push: jest.fn(),
  replace: jest.fn(),
});

export const mockHistory = generateHistoryMock();

export const generateRoutesMock = (): RouteSpyState => ({
  pageName: SecurityPageName.noPage,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
  history: mockHistory,
});
