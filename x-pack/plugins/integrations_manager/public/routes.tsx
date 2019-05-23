/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { APP } from '../common/constants';
import { Detail } from './screens/Detail';
import { Home } from './screens/Home';

export const routes = [
  <Route exact={true} path={APP.LIST_VIEW} component={Home} breadcrumb="Home" key="home" />,
  <Route exact={true} path={APP.DETAIL_VIEW} component={Detail} breadcrumb="Detail" key="detail" />,
];
