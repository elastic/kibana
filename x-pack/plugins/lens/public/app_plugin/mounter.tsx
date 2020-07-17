/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { AppMountParameters, CoreSetup } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App } from './app';
import { EditorFrameStart } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { Document, SavedObjectIndexStore } from '../persistence';
import { LensPluginStartDependencies, FeatureFlagConfig } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE } from '../../common';

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  createEditorFrame: EditorFrameStart['createInstance'],
  featureFlagConfig: FeatureFlagConfig
) {
  const [coreStart, startDependencies] = await core.getStartServices();
  const { data: dataStart, navigation, embeddable } = startDependencies;
  const savedObjectsClient = coreStart.savedObjects.client;
  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);

  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.lens.pageTitle', { defaultMessage: 'Lens' })
  );

  const stateTransfer = embeddable?.getStateTransfer(params.history);
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState();

  const instance = await createEditorFrame();

  setReportManager(
    new LensReportManager({
      storage: new Storage(localStorage),
      http: core.http,
    })
  );
  const redirectTo = (
    routeProps: RouteComponentProps<{ id?: string }>,
    savedObjectId?: string,
    document?: Document,
    returnToOrigin?: boolean,
    newlyCreated?: boolean
  ) => {
    if (!savedObjectId && !newlyCreated && !returnToOrigin) {
      routeProps.history.push('/');
    } else if (savedObjectId && !embeddableEditorIncomingState?.originatingApp && !returnToOrigin) {
      routeProps.history.push(`/edit/${savedObjectId}`);
    } else if (!!embeddableEditorIncomingState?.originatingApp && returnToOrigin) {
      if (savedObjectId) {
        routeProps.history.push(`/edit/${savedObjectId}`);
      }
      if (newlyCreated && stateTransfer) {
        const input = savedObjectId ? { savedObjectId } : { attributes: document };
        stateTransfer.navigateToWithEmbeddablePackage(
          embeddableEditorIncomingState?.originatingApp,
          {
            state: {
              embeddableId: embeddableEditorIncomingState.embeddableId,
              type: LENS_EMBEDDABLE_TYPE,
              input,
            },
          }
        );
      } else {
        coreStart.application.navigateToApp(embeddableEditorIncomingState?.originatingApp);
      }
    }
  };

  const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
    trackUiEvent('loaded');
    return (
      <App
        core={coreStart}
        data={dataStart}
        navigation={navigation}
        editorFrame={instance}
        storage={new Storage(localStorage)}
        savedObjectId={routeProps.match.params.id}
        docStorage={new SavedObjectIndexStore(savedObjectsClient)}
        featureFlagConfig={featureFlagConfig}
        redirectTo={(savedObjectId, documentByValue, returnToOrigin, newlyCreated) =>
          redirectTo(routeProps, savedObjectId, documentByValue, returnToOrigin, newlyCreated)
        }
        embeddableEditorIncomingState={embeddableEditorIncomingState}
        onAppLeave={params.onAppLeave}
        history={routeProps.history}
      />
    );
  };

  function NotFound() {
    trackUiEvent('loaded_404');
    return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
  }

  params.element.classList.add('lnsAppWrapper');
  render(
    <I18nProvider>
      <HashRouter>
        <Switch>
          <Route exact path="/edit/:id" render={renderEditor} />
          <Route exact path={`/${LENS_EDIT_BY_VALUE}`} render={renderEditor} />
          <Route exact path="/" render={renderEditor} />
          <Route path="/" component={NotFound} />
        </Switch>
      </HashRouter>
    </I18nProvider>,
    params.element
  );
  return () => {
    instance.unmount();
    unmountComponentAtNode(params.element);
  };
}
