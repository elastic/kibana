/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { generatePath } from 'react-router-dom';
import { Detail } from './screens/detail';
import { Home } from './screens/home';
import { ID } from '../common/constants';

export const APP_ROOT = `/app/${ID}`;

// the `*_VIEW` routes are relative to `APP_ROOT`
export const LIST_VIEW = '/';

export const DETAIL_VIEW = '/detail/:pkgkey';

export const linkToDetailView = ({ name, version }: { name: string; version: string }) =>
  generatePath(DETAIL_VIEW, { pkgkey: `${name}-${version}` });

export const routes = [
  <Route exact={true} path={LIST_VIEW} component={Home} breadcrumb="Home" key="home" />,
  <Route exact={true} path={DETAIL_VIEW} component={Detail} breadcrumb="Detail" key="detail" />,
];
