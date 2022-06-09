/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { createContext, Dispatch } from 'react';
import { matchPath } from 'react-router-dom';
import { ALERTS_PATH, CASES_PATH, RULES_PATH } from '../../../../common/constants';

import { RouteSpyState, RouteSpyAction } from './types';

export const initRouteSpy: RouteSpyState = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
  state: undefined,
};

export const RouterSpyStateContext = createContext<[RouteSpyState, Dispatch<RouteSpyAction>]>([
  initRouteSpy,
  () => noop,
]);

const detectionsPaths = [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${CASES_PATH}/:detailName`];

export const isDetectionPage = (pathname: string) =>
  matchPath(pathname, {
    path: detectionsPaths,
    strict: false,
  }) !== null;
