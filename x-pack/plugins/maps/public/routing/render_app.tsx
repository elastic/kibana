/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect, RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { AppMountParameters } from 'kibana/public';
import {
  getCoreChrome,
  getCoreI18n,
  getMapsCapabilities,
  getToasts,
  getEmbeddableService,
} from '../kibana_services';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
  IKbnUrlStateStorage,
} from '../../../../../src/plugins/kibana_utils/public';
import { getStore } from './store_operations';
import { LoadListAndRender } from './routes/list/load_list_and_render';
import { MapApp } from './routes/map_app';

export let goToSpecifiedPath: (path: string) => void;
export let kbnUrlStateStorage: IKbnUrlStateStorage;

export async function renderApp({
  appBasePath,
  element,
  history,
  onAppLeave,
  setHeaderActionMenu,
}: AppMountParameters) {
  goToSpecifiedPath = (path) => history.push(path);
  kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: false,
    history,
    ...withNotifyOnErrors(getToasts()),
  });

  const store = getStore();
  const I18nContext = getCoreI18n().Context;

  const stateTransfer = getEmbeddableService()?.getStateTransfer(
    history as AppMountParameters['history']
  );

  const { originatingApp } =
    stateTransfer?.getIncomingEditorState({ keysToRemoveAfterFetch: ['originatingApp'] }) || {};

  if (!getMapsCapabilities().save) {
    getCoreChrome().setBadge({
      text: i18n.translate('xpack.maps.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('xpack.maps.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save maps',
      }),
      iconType: 'glasses',
    });
  }

  render(
    <I18nContext>
      <Provider store={store}>
        <Router history={history}>
          <Switch>
            <Route
              path={`/map/:savedMapId`}
              render={(props) => (
                <MapApp
                  savedMapId={props.match.params.savedMapId}
                  onAppLeave={onAppLeave}
                  setHeaderActionMenu={setHeaderActionMenu}
                  stateTransfer={stateTransfer}
                  originatingApp={originatingApp}
                />
              )}
            />
            <Route
              exact
              path={`/map`}
              render={() => (
                <MapApp
                  onAppLeave={onAppLeave}
                  setHeaderActionMenu={setHeaderActionMenu}
                  stateTransfer={stateTransfer}
                  originatingApp={originatingApp}
                />
              )}
            />
            // Redirect other routes to list, or if hash-containing, their non-hash equivalents
            <Route
              path={``}
              render={({ location: { pathname, hash } }) => {
                if (hash) {
                  // Remove leading hash
                  const newPath = hash.substr(1);
                  return <Redirect to={newPath} />;
                } else if (pathname === '/' || pathname === '') {
                  return <LoadListAndRender />;
                } else {
                  return <Redirect to="/" />;
                }
              }}
            />
          </Switch>
        </Router>
      </Provider>
    </I18nContext>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
}
