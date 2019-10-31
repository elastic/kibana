/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { Switch, Route } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';

import { Page } from '../../components/page';
import { RouteNotFound } from '../../components/route_not_found';
import { endpointsSubRoutes } from './endpoints_sub_route_paths';
import { PocSelectorConnected } from './poc_selector';
import { EndpointDetailConnected } from './endpoint_detail_view';

export class EndpointsPage extends PureComponent {
  render() {
    return (
      <Page title="Endpoints">
        <PocSelectorConnected />
        <EuiSpacer size="xxl" />
        <Switch>
          {endpointsSubRoutes.map(({ id, path, component }) => (
            <Route path={path} exact key={id} component={component} />
          ))}

          <Route exact path="/endpoints/view/:id" component={EndpointDetailConnected} />

          <Route path="/endpoints/*" component={RouteNotFound} />
        </Switch>
      </Page>
    );
  }
}
