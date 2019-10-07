/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AppMountContext, AppMountParameters } from 'kibana/public';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Link } from 'react-router-dom';
import { toAsyncComponent } from '../common/to_async_component';
import { EndgameAppContext } from '../common/app_context';

const ShowLanding = toAsyncComponent(
  async () => ((await import('./landing')).LandingPage as unknown) as PureComponent
);

const ShowEndpoints = toAsyncComponent(
  async () => ((await import('./endpoints')).EndpointsPage as unknown) as PureComponent
);

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
          <h1>EndGame App</h1>
          <hr />
          <div>
            <Link to="/">Home</Link> | <Link to="/endpoints">Endpoints</Link>
          </div>
          <Route path="/" exact component={ShowLanding} />
          <Route path="/endpoints" exact component={ShowEndpoints} />
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
