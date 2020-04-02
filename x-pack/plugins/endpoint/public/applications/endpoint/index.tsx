/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters, ScopedHistory } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { Route, Switch, Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { useObservable } from 'react-use';
import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { RouteCapture } from './view/route_capture';
import { EndpointPluginStartDependencies } from '../../plugin';
import { appStoreFactory } from './store';
import { AlertIndex } from './view/alerts';
import { HostList } from './view/hosts';
import { PolicyList } from './view/policy';
import { PolicyDetails } from './view/policy';
import { EuiThemeProvider } from '../../../../../legacy/common/eui_styled_components';
import { IngestManagerSetup } from '../../../../ingest_manager/public';
import { Loading } from './components/loading';
import { Error } from './components/error';
import { HeaderNavigation } from './components/header_nav';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  ingestManager: IngestManagerSetup,
  { element, history }: AppMountParameters
) {
  const store = appStoreFactory({ coreStart, depsStart });
  ReactDOM.render(
    <AppRoot
      history={history}
      store={store}
      coreStart={coreStart}
      depsStart={depsStart}
      ingestManager={ingestManager}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

interface RouterProps {
  history: ScopedHistory;
  store: Store;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
  ingestManager: IngestManagerSetup;
}

const IsAppUnavailable: React.FunctionComponent<{
  ingestManager: IngestManagerSetup;
  setIsAppUnavailable: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ ingestManager, setIsAppUnavailable }) => {
  (async () => {
    if (await isIngestManagerInitialized(ingestManager)) {
      setIsAppUnavailable(false);
      return <Loading />;
    }
  })();

  const [hasIngestSetupFinished, setHasIngestSetupFinished] = React.useState(false);
  const [isIngestInitSuccessful, setIsIngestInitSuccessful] = React.useState(false);
  const [ingestInitError, setIngestInitError] = React.useState<Error | undefined>(undefined);
  React.useEffect(() => {
    ingestManager
      .setup()
      .then(response => {
        setHasIngestSetupFinished(true);
        if (response.error) {
          setIngestInitError(response.error);
        } else {
          setIsIngestInitSuccessful(response.data?.isInitialized || false);
        }
      })
      .catch(error => {
        setHasIngestSetupFinished(true);
        setIngestInitError(error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasIngestSetupFinished) {
    return <Loading />;
  }

  if (!isIngestInitSuccessful || ingestInitError) {
    return (
      <EuiErrorBoundary>
        {ingestInitError ? (
          <Error
            title={
              <FormattedMessage
                id="xpack.endpoint.ingestInitializationErrorMessageTitle"
                defaultMessage="Unable to initialize Ingest Manager"
              />
            }
            error={ingestInitError}
          />
        ) : (
          <Error
            title={
              <FormattedMessage
                id="xpack.endpoint.ingestInitializationErrorMessageTitle"
                defaultMessage="Unable to initialize Ingest Manager"
              />
            }
            error={i18n.translate('xpack.endpoint.ingestInitializationDefaultError', {
              defaultMessage: 'Ingest Manager failed to initialize for an unknown reason',
            })}
          />
        )}
      </EuiErrorBoundary>
    );
  }
  setIsAppUnavailable(false);
  return <Loading />;
};

async function isIngestManagerInitialized(ingestManager: IngestManagerSetup) {
  const resp = await ingestManager.isInitialized();
  if (resp.error) {
    return false;
  }
  return resp.data?.isInitialized || false;
}

const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({
    history,
    store,
    coreStart: { http, notifications, uiSettings, application },
    depsStart: { data },
    ingestManager,
  }) => {
    const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));
    const [isAppUnavailable, setIsAppUnavailable] = React.useState(true);

    return (
      <Provider store={store}>
        <I18nProvider>
          <KibanaContextProvider services={{ http, notifications, application, data }}>
            <EuiThemeProvider darkMode={isDarkMode}>
              {isAppUnavailable ? (
                <IsAppUnavailable
                  ingestManager={ingestManager}
                  setIsAppUnavailable={setIsAppUnavailable}
                />
              ) : (
                <Router history={history}>
                  <RouteCapture>
                    <HeaderNavigation />
                    <Switch>
                      <Route
                        exact
                        path="/"
                        render={() => (
                          <h1 data-test-subj="welcomeTitle">
                            <FormattedMessage
                              id="xpack.endpoint.welcomeTitle"
                              defaultMessage="Hello World"
                            />
                          </h1>
                        )}
                      />
                      <Route path="/hosts" component={HostList} />
                      <Route path="/alerts" component={AlertIndex} />
                      <Route path="/policy" exact component={PolicyList} />
                      <Route path="/policy/:id" exact component={PolicyDetails} />
                      <Route
                        render={() => (
                          <FormattedMessage
                            id="xpack.endpoint.notFound"
                            defaultMessage="Page Not Found"
                          />
                        )}
                      />
                    </Switch>
                  </RouteCapture>
                </Router>
              )}
            </EuiThemeProvider>
          </KibanaContextProvider>
        </I18nProvider>
      </Provider>
    );
  }
);
