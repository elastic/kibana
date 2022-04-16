/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect, RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters } from 'kibana/public';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import { KibanaThemeProvider } from '../../../../src/plugins/kibana_react/public';
import {
  getCoreChrome,
  getCoreI18n,
  getMapsCapabilities,
  getToasts,
  getEmbeddableService,
  getDocLinks,
  getCore,
} from './kibana_services';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
  IKbnUrlStateStorage,
} from '../../../../src/plugins/kibana_utils/public';
import { ListPage, MapPage } from './routes';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';
import { APP_ID } from '../common/constants';
import { registerLayerWizards } from './classes/layers/wizards/load_layer_wizards';

export let goToSpecifiedPath: (path: string) => void;
export let kbnUrlStateStorage: IKbnUrlStateStorage;

function setAppChrome() {
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

  const mapUrl = getDocLinks().links.maps.guide;

  getCoreChrome().setHelpExtension({
    appName: 'Maps',
    links: [
      {
        linkType: 'documentation',
        href: `${mapUrl}`,
      },
      {
        linkType: 'github',
        title: '[Maps]',
        labels: ['Team:Geo'],
      },
    ],
  });
}

export async function renderApp(
  { element, history, onAppLeave, setHeaderActionMenu, theme$ }: AppMountParameters,
  AppUsageTracker: React.FC
) {
  goToSpecifiedPath = (path) => history.push(path);
  kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: false,
    history,
    ...withNotifyOnErrors(getToasts()),
  });

  const stateTransfer = getEmbeddableService().getStateTransfer();

  registerLayerWizards();
  setAppChrome();

  function renderMapApp(routeProps: RouteComponentProps<{ savedMapId?: string }>) {
    const { embeddableId, originatingApp, valueInput, originatingPath } =
      stateTransfer.getIncomingEditorState(APP_ID) || {};

    let mapEmbeddableInput;
    if (routeProps.match.params.savedMapId) {
      mapEmbeddableInput = {
        savedObjectId: routeProps.match.params.savedMapId,
      } as MapByReferenceInput;
    }
    if (valueInput) {
      mapEmbeddableInput = valueInput as MapByValueInput;
    }

    return (
      <ExitFullScreenButtonKibanaProvider coreStart={getCore()}>
        <MapPage
          mapEmbeddableInput={mapEmbeddableInput}
          embeddableId={embeddableId}
          onAppLeave={onAppLeave}
          setHeaderActionMenu={setHeaderActionMenu}
          stateTransfer={stateTransfer}
          originatingApp={originatingApp}
          originatingPath={originatingPath}
          history={history}
          key={routeProps.match.params.savedMapId ? routeProps.match.params.savedMapId : 'new'}
        />
      </ExitFullScreenButtonKibanaProvider>
    );
  }

  const I18nContext = getCoreI18n().Context;
  render(
    <AppUsageTracker>
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <Router history={history}>
            <Switch>
              <Route path={`/map/:savedMapId`} render={renderMapApp} />
              <Route exact path={`/map`} render={renderMapApp} />
              // Redirect other routes to list, or if hash-containing, their non-hash equivalents
              <Route
                path={``}
                render={({ location: { pathname, hash } }) => {
                  if (hash) {
                    // Remove leading hash
                    const newPath = hash.substr(1);
                    return <Redirect to={newPath} />;
                  } else if (pathname === '/' || pathname === '') {
                    return <ListPage stateTransfer={stateTransfer} />;
                  } else {
                    return <Redirect to="/" />;
                  }
                }}
              />
            </Switch>
          </Router>
        </KibanaThemeProvider>
      </I18nContext>
    </AppUsageTracker>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
}
