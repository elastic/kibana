/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';

import {
  CASES_PATH,
  ALERTS_PATH,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  DATA_QUALITY_PATH,
} from '../../../common/constants';
import { SourcererScopeName } from '../store/model';

export const sourcererPaths = [
  ALERTS_PATH,
  DATA_QUALITY_PATH,
  `${RULES_PATH}/id/:id`,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
];

const detectionsPaths = [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${CASES_PATH}/:detailName`];

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections =>
  matchPath(pathname, {
    path: detectionsPaths,
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;

export const showSourcererByPath = (pathname: string): boolean =>
  matchPath(pathname, {
    path: sourcererPaths,
    strict: false,
  }) != null;
