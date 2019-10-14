/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountContext, AppMountParameters } from 'kibana/public';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiPageSideBar, EuiSideNav, EuiImage } from '@elastic/eui';
import { toAsyncComponent } from '../common/to_async_component';
import { EndgameAppContext } from '../common/app_context';
import LogoUrl from '../static/images/logo.png';

const ShowLanding = toAsyncComponent(
  async () => ((await import('./landing')).LandingPage as unknown) as PureComponent
);

const ShowEndpoints = toAsyncComponent(
  async () => ((await import('./endpoints')).EndpointsPage as unknown) as PureComponent
);

const NavBar = withRouter(function({ history }: RouteComponentProps) {
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
          items: [
            {
              name: 'Home',
              id: '1',
              onClick: () => {
                history.push('/');
                return false;
              },
            },
            {
              name: 'Endpoints',
              id: '2',
              // href: history.createHref({ pathname: '/endpoints' }),
              onClick: () => {
                history.push('/endpoints');
                return false;
              },
            },
          ],
        },
      ]}
    />
  );
});

class EndgameApp extends PureComponent<
  {
    appBasePath: string;
    appContext: AppMountContext;
  },
  {}
> {
  render() {
    const { appBasePath, appContext } = this.props;
    return (
      <BrowserRouter basename={appBasePath}>
        <EndgameAppContext.Provider value={{ appContext }}>
          <EuiPage>
            <EuiPageSideBar>
              <NavBar />
            </EuiPageSideBar>
            <Route path="/" exact component={ShowLanding} />
            <Route path="/endpoints" exact component={ShowEndpoints} />
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
