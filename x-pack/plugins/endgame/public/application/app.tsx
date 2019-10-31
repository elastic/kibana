/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountContext, AppMountParameters } from 'kibana/public';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, withRouter, Switch, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiPageSideBar, EuiSideNav, EuiImage } from '@elastic/eui';
import { EndgameAppContext } from '../common/app_context';
import LogoUrl from '../static/images/logo.png';
import { routePaths } from '../common/route_paths';
import { Page } from '../components/page';
import { RouteNotFound } from '../components/route_not_found';

const NotFoundPage = (props: RouteComponentProps) => {
  return (
    <Page>
      <RouteNotFound {...props} />
    </Page>
  );
};

const NavBar = withRouter(function({ history }) {
  return (
    <EuiSideNav
      items={[
        {
          name: 'Endpoint Security',
          id: '0',
          icon: (
            <EuiImage
              alt="Endpoint Security"
              url={LogoUrl}
              size="fullWidth"
              style={{ width: '16px' }}
            />
          ),
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
        <EndgameAppContext.Provider
          value={{
            appContext,
            basePath: appBasePath,
            apiPrefixPath: `/app/endgame/_api`, // When used with the `appContent.core.http.get` service, the server prefix is added
          }}
        >
          <EuiPage>
            <EuiPageSideBar>
              <NavBar />
            </EuiPageSideBar>
            <Switch>
              {routePaths.map(({ id, path, component, exact }) => (
                <Route path={path} exact={exact} component={component} key={id} />
              ))}
              <Route path="*" component={NotFoundPage} />
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
