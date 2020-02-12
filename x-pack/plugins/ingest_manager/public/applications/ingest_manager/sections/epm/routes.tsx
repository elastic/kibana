/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
// import { PLUGIN } from '../common/constants';
// import { Detail, DetailProps } from './screens/detail';
import { Home } from './screens/home';

// patterns are used by React Router and are relative to `APP_ROOT`
// XXX this is currently not used to set up the routes, but useLinks needs it.
export const patterns = {
  APP_ROOT: `/app/ingestManager#/`,
  LIST_VIEW: '/epm/',
  DETAIL_VIEW: '/epm/detail/:pkgkey/:panel?',
};

// export const routes = [
//   <Route key="home" path={patterns.LIST_VIEW} exact={true} component={Home} />,
//   <Route
//     key="detail"
//     path={patterns.DETAIL_VIEW}
//     exact={true}
//     render={(props: DetailMatch) => <Detail {...props.match.params} />}
//   />,
// ];

export const routes = [
  <Route key="home" path={patterns.LIST_VIEW} exact={true} component={Home} />,
];

// interface DetailMatch {
//   match: {
//     params: DetailProps;
//   };
// }
