/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountContext, AppMountParameters } from 'kibana/public';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, withRouter, RouteComponentProps, Switch } from 'react-router-dom';
import { EuiPage, EuiPageSideBar, EuiSideNav, EuiImage, EuiCallOut } from '@elastic/eui';
import { EndgameAppContext } from '../common/app_context';
import LogoUrl from '../static/images/logo.png';
import { routePaths } from '../common/route_paths';
import { Page } from '../components/page';

const NavBar = withRouter(function({ history }: RouteComponentProps) {
  return (
    <EuiSideNav
      items={[
        {
          name: 'Endpoint Security',
          id: '0',
          /**
          icon: (
            <EuiImage
              alt="Endpoint Security"
              url={LogoUrl}
              size="fullWidth"
              style={{ width: '16px' }}
            />
          ),
             **/
          items: routePaths.map(({ name, id, path }) => ({
            name,
            id,
            onClick() {
              history.push(path);
            },
          })),
        },
      ]}
    />
  );
});

class EndgameApp extends PureComponent<{
  appBasePath: string;
  appContext: AppMountContext;
}> {
  render() {
    const { appBasePath, appContext } = this.props;
    return (
      <BrowserRouter basename={appBasePath}>
        <EndgameAppContext.Provider value={{ appContext }}>
          <EuiPage>
            <EuiPageSideBar>
              <NavBar />
            </EuiPageSideBar>
            <Switch>
              {routePaths.map(({ id, path, component }) => (
                <Route path={path} exact component={component} key={id} />
              ))}
              <Route path="*">
                <Page>
                  <EuiCallOut title="Route not found (404)" color="warning" iconType="help">
                    <p>That page does not exists - OK? :-)</p>
                  </EuiCallOut>
                </Page>
              </Route>
            </Switch>
          </EuiPage>
        </EndgameAppContext.Provider>
      </BrowserRouter>
    );
  }
}

export function mountApp(context: AppMountContext, { appBasePath, element }: AppMountParameters) {
  ReactDOM.render(<EndgameApp appBasePath={appBasePath} appContext={context} />, element);
  return function unmountApp() {
    ReactDOM.unmountComponentAtNode(element);
  };
}
