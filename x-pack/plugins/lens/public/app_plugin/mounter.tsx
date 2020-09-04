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

import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
import { Optional } from '@kbn/utility-types';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App } from './app';
import { EditorFrameStart } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE } from '../../common';
import {
  LensEmbeddableInput,
  LensByReferenceInput,
  LensByValueInput,
} from '../editor_frame_service/embeddable/embeddable';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    getByValueFeatureFlag: () => Promise<DashboardFeatureFlagConfig>;
    attributeService: LensAttributeService;
  }
) {
  const { createEditorFrame, getByValueFeatureFlag, attributeService } = mountProps;
  const [coreStart, startDependencies] = await core.getStartServices();
  const { data, navigation, embeddable } = startDependencies;

  const instance = await createEditorFrame();
  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer(params.history);
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState();

  const lensServices: LensAppServices = {
    data,
    storage,
    navigation,
    attributeService,
    http: coreStart.http,
    chrome: coreStart.chrome,
    uiSettings: coreStart.uiSettings,
    application: coreStart.application,
    notifications: coreStart.notifications,
    incomingState: embeddableEditorIncomingState,

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag: await getByValueFeatureFlag(),
  };

  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);
  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.lens.pageTitle', { defaultMessage: 'Lens' })
  );

  setReportManager(
    new LensReportManager({
      http: core.http,
      storage,
    })
  );

  const getInitialInput = (
    routeProps: RouteComponentProps<{ id?: string }>
  ): LensEmbeddableInput | undefined => {
    if (routeProps.match.params.id) {
      return { savedObjectId: routeProps.match.params.id } as LensByReferenceInput;
    }
    if (embeddableEditorIncomingState?.valueInput) {
      return embeddableEditorIncomingState?.valueInput as LensByValueInput;
    }
  };

  const redirectTo = (routeProps: RouteComponentProps<{ id?: string }>, savedObjectId?: string) => {
    if (!savedObjectId) {
      routeProps.history.push('/');
    } else {
      routeProps.history.push(`/edit/${savedObjectId}`);
    }
  };

  const redirectToOrigin = (input?: Optional<LensEmbeddableInput, 'id'>) => {
    if (!embeddableEditorIncomingState?.originatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    if (stateTransfer && input) {
      stateTransfer.navigateToWithEmbeddablePackage(embeddableEditorIncomingState?.originatingApp, {
        state: {
          embeddableId: embeddableEditorIncomingState.embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input,
        },
      });
    } else {
      coreStart.application.navigateToApp(embeddableEditorIncomingState?.originatingApp);
    }
  };

  // const featureFlagConfig = await getByValueFeatureFlag();
  const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
    trackUiEvent('loaded');
    return (
      <App
        editorFrame={instance}
        initialInput={getInitialInput(routeProps)}
        redirectTo={(savedObjectId?: string) => redirectTo(routeProps, savedObjectId)}
        redirectToOrigin={redirectToOrigin}
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
      <KibanaContextProvider services={lensServices}>
        <HashRouter>
          <Switch>
            <Route exact path="/edit/:id" render={renderEditor} />
            <Route exact path={`/${LENS_EDIT_BY_VALUE}`} render={renderEditor} />
            <Route exact path="/" render={renderEditor} />
            <Route path="/" component={NotFound} />
          </Switch>
        </HashRouter>
      </KibanaContextProvider>
    </I18nProvider>,
    params.element
  );
  return () => {
    instance.unmount();
    unmountComponentAtNode(params.element);
  };
}
