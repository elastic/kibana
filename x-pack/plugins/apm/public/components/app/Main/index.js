/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { Route, Switch } from 'react-router-dom';
import { routes } from './routeConfig';
import ScrollToTopOnPathChange from './ScrollToTopOnPathChange';
import { px, units, unit, topNavHeight } from '../../../style/variables';
import ConnectRouterToRedux from '../../shared/ConnectRouterToRedux';
import { UpdateBreadcrumbs } from './UpdateBreadcrumbs';

const MainContainer = styled.div`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  min-height: calc(100vh - ${topNavHeight});
`;

export default function Main() {
  return (
    <MainContainer>
      <UpdateBreadcrumbs />
      <Route component={ConnectRouterToRedux} />
      <Route component={ScrollToTopOnPathChange} />
      {routes.map((route, i) => {
        return route.switchRoutes ? (
          <Switch key={i}>
            {route.switchRoutes.map((route, i) => (
              <Route key={i} {...route} />
            ))}
          </Switch>
        ) : (
          <Route key={i} {...route} />
        );
      })}
    </MainContainer>
  );
}
