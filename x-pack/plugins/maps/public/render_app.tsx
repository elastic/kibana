/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import { KibanaThemeProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
  IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { FormattedRelative } from '@kbn/i18n-react';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list';
import {
  getCoreChrome,
  getCoreI18n,
  getMapsCapabilities,
  getToasts,
  getEmbeddableService,
  getDocLinks,
  getCore,
} from './kibana_services';
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
  goToSpecifiedPath = (path) => history.push(path);
  kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: false,
    history,
    ...withNotifyOnErrors(getToasts()),
  });

  const stateTransfer = getEmbeddableService().getStateTransfer();

  registerLayerWizards();
  setAppChrome();

  const RenderMapApp = () => {
    const params = useParams<{ savedMapId: string }>();
    const { embeddableId, originatingApp, valueInput, originatingPath } =
      stateTransfer.getIncomingEditorState(APP_ID) || {};

    let mapEmbeddableInput;
    if (params.savedMapId) {
      mapEmbeddableInput = {
        savedObjectId: params.savedMapId,
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
          key={params.savedMapId ? params.savedMapId : 'new'}
        />
      </ExitFullScreenButtonKibanaProvider>
    );
  };

  const DefaultRoute = () => {
    const { hash, pathname } = useLocation();

    if (hash) {
      // Remove leading hash
      const newPath = hash.substr(1);
      return <Navigate to={newPath} />;
    } else if (pathname === '/' || pathname === '') {
      return <ListPage stateTransfer={stateTransfer} />;
    } else {
      return <Navigate to="/" />;
    }
  };

  const App = () => {
    return (
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
              <Router navigator={history} location={history.location}>
                <Routes>
                  <Route path={`/map/:savedMapId`} element={RenderMapApp} />
                  <Route path={`/map`} element={RenderMapApp} />
                  {/* // Redirect other routes to list, or if hash-containing, their non-hash
                  equivalents */}
                  <Route path={``} element={DefaultRoute} />
                </Routes>
              </Router>
            </TableListViewKibanaProvider>
          </KibanaThemeProvider>
        </I18nContext>
      </AppUsageTracker>
    );
  };

  const I18nContext = getCoreI18n().Context;
  render(<App />, element);

  return () => {
    unmountComponentAtNode(element);
  };
}
