/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Redirect } from 'react-router-dom';
import { useParams } from 'react-router-dom-v5-compat';
import { Route } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import { KibanaThemeProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { FormattedRelative } from '@kbn/i18n-react';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import {
  getCoreChrome,
  getCoreI18n,
  getMapsCapabilities,
  getEmbeddableService,
  getDocLinks,
  getCore,
} from './kibana_services';
import { ListPage, MapPage } from './routes';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';
import { APP_ID } from '../common/constants';
import { registerLayerWizards } from './classes/layers/wizards/load_layer_wizards';

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

type MapAppRouteProps = Pick<
  AppMountParameters,
  'history' | 'onAppLeave' | 'setHeaderActionMenu'
> & {
  stateTransfer: EmbeddableStateTransfer;
};

const MapAppRoute: React.FC<MapAppRouteProps> = ({
  history,
  onAppLeave,
  setHeaderActionMenu,
  stateTransfer,
}) => {
  const params = useParams();
  const { embeddableId, originatingApp, valueInput, originatingPath } =
    stateTransfer.getIncomingEditorState(APP_ID) || {};

  let mapEmbeddableInput;
  if (params.savedMapId) {
    mapEmbeddableInput = {
      savedObjectId: params.savedMapId,
    } as MapByReferenceInput;
  } else if (valueInput) {
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
        key={params.savedMapId ? params.savedMapId : 'new'}
      />
    </ExitFullScreenButtonKibanaProvider>
  );
};

export async function renderApp(
  { element, history, onAppLeave, setHeaderActionMenu, theme$ }: AppMountParameters,
  {
    coreStart,
    AppUsageTracker,
    savedObjectsTagging,
  }: {
    coreStart: CoreStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    AppUsageTracker: React.FC;
  }
) {
  const stateTransfer = getEmbeddableService().getStateTransfer();

  registerLayerWizards();
  setAppChrome();

  const mapAppRouteProps = {
    history,
    onAppLeave,
    setHeaderActionMenu,
    stateTransfer,
  };

  const I18nContext = getCoreI18n().Context;
  render(
    <AppUsageTracker>
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <TableListViewKibanaProvider
            {...{
              core: coreStart,
              toMountPoint,
              savedObjectsTagging,
              FormattedRelative,
            }}
          >
            <Router history={history}>
              <Switch>
                <Route path={`/map/:savedMapId`}>
                  <MapAppRoute {...mapAppRouteProps} />
                </Route>
                <Route exact path={`/map`}>
                  <MapAppRoute {...mapAppRouteProps} />
                </Route>
                {/* // Redirect other routes to list, or if hash-containing, their non-hash equivalents */}
                <Route
                  path={``}
                  render={({ location: { pathname, hash } }) => {
                    if (hash) {
                      // Remove leading hash
                      const newPath = hash.substr(1);
                      return <Redirect to={newPath} />;
                    } else if (pathname === '/' || pathname === '') {
                      return <ListPage history={history} stateTransfer={stateTransfer} />;
                    } else {
                      return <Redirect to="/" />;
                    }
                  }}
                />
              </Switch>
            </Router>
          </TableListViewKibanaProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </AppUsageTracker>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
}
