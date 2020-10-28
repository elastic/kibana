/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiTabs, EuiTab, EuiTabbedContentTab, EuiSpacer } from '@elastic/eui';
import { Switch, Route, RouteProps, RedirectProps } from 'react-router-dom';
import { reactRouterNavigate } from '../../../../../../src/plugins/kibana_react/public';

export type TabbedRoutesTab = EuiTabbedContentTab &
  Pick<RouteProps, 'path' | 'exact'> &
  Pick<RedirectProps, 'to'>;

export interface TabbedRoutesProps {
  routes: TabbedRoutesTab[];
}
export const TabbedRoutes: FunctionComponent<TabbedRoutesProps> = ({ routes }) => {
  return (
    <>
      <EuiTabs>
        {routes.map((route) => (
          <Route key={route.id} path={route.path} exact={route.exact}>
            {({ match, history }) => (
              <EuiTab isSelected={!!match} {...reactRouterNavigate(history, route.to)}>
                {route.name}
              </EuiTab>
            )}
          </Route>
        ))}
      </EuiTabs>
      <EuiSpacer />
      <Switch>
        {routes.map((route) => (
          <Route key={route.id} path={route.path} exact={route.exact}>
            {route.content}
          </Route>
        ))}
      </Switch>
    </>
  );
};
