/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { px, topNavHeight, unit, units } from '../../../style/variables';
import { LoadingIndicatorProvider } from '../../../context/LoadingIndicatorContext';
import { routes } from './routeConfig';
import { ScrollToTopOnPathChange } from './ScrollToTopOnPathChange';
import { UpdateBreadcrumbs } from './UpdateBreadcrumbs';
import { LicenseProvider } from '../../../context/LicenseContext';

const MainContainer = styled.div`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  min-height: calc(100vh - ${topNavHeight});
`;

export function Main() {
  return (
    <LoadingIndicatorProvider>
      <MainContainer data-test-subj="apmMainContainer">
        <UpdateBreadcrumbs />
        <Route component={ScrollToTopOnPathChange} />
        <LicenseProvider>
          <Switch>
            {routes.map((route, i) => (
              <Route key={i} {...route} />
            ))}
          </Switch>
        </LicenseProvider>
      </MainContainer>
    </LoadingIndicatorProvider>
  );
}
