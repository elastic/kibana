/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { httpServiceMock } from 'src/core/public/mocks';
import { KibanaContextProvider, KibanaPageTemplate } from 'src/plugins/kibana_react/public';

import { RedirectToInventory } from './redirect_to_inventory';

const renderRoutes = (routes: React.ReactElement) => {
  const history = createMemoryHistory();
  const services = {
    http: httpServiceMock.createStartContract(),
    data: {
      indexPatterns: {},
    },
    observability: {
      navigation: {
        PageTemplate: KibanaPageTemplate,
      },
    },
  };
  const renderResult = render(
    <KibanaContextProvider services={services}>
      <Router history={history}>{routes}</Router>
    </KibanaContextProvider>
  );

  return {
    ...renderResult,
    history,
    services,
  };
};

describe('LinkToMetricsInventoryPage', () => {
  describe('default route', () => {
    it('Redirects to the inventory at a given time', () => {
      const { history } = renderRoutes(
        <Switch>
          <Route path="/link-to" component={RedirectToInventory} />
        </Switch>
      );

      history.push('/link-to?time=1630936800000');

      expect(history.location.pathname).toEqual('/inventory');
      expect(history.location.search).toContain('currentTime:1630936800000');
    });
  });
});
