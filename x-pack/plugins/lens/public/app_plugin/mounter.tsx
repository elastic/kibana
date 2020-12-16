/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';

import { AppMountParameters, CoreSetup } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
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
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    getByValueFeatureFlag: () => Promise<DashboardFeatureFlagConfig>;
    attributeService: () => Promise<LensAttributeService>;
  }
) {
  const { createEditorFrame, getByValueFeatureFlag, attributeService } = mountProps;
  const [coreStart, startDependencies] = await core.getStartServices();
  const { data, navigation, embeddable, savedObjectsTagging } = startDependencies;

  const instance = await createEditorFrame();
  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer();
  const historyLocationState = params.history.location.state as HistoryLocationState;
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState();

  const lensServices: LensAppServices = {
    data,
    storage,
    navigation,
    stateTransfer,
    savedObjectsTagging,
    attributeService: await attributeService(),
    http: coreStart.http,
    chrome: coreStart.chrome,
    overlays: coreStart.overlays,
    uiSettings: coreStart.uiSettings,
    application: coreStart.application,
    notifications: coreStart.notifications,
    savedObjectsClient: coreStart.savedObjects.client,
    getOriginatingAppName: () => {
      return embeddableEditorIncomingState?.originatingApp
        ? stateTransfer?.getAppNameFromId(embeddableEditorIncomingState.originatingApp)
        : undefined;
    },

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

  const getInitialInput = (id?: string, editByValue?: boolean): LensEmbeddableInput | undefined => {
    if (editByValue) {
      return embeddableEditorIncomingState?.valueInput as LensByValueInput;
    }
    if (id) {
      return { savedObjectId: id } as LensByReferenceInput;
    }
  };

  const redirectTo = (history: History<unknown>, savedObjectId?: string) => {
    if (!savedObjectId) {
      history.push({ pathname: '/', search: history.location.search });
    } else {
      history.push({
        pathname: `/edit/${savedObjectId}`,
        search: history.location.search,
      });
    }
  };

  const redirectToDashboard = (embeddableInput: LensEmbeddableInput, dashboardId: string) => {
    if (!lensServices.dashboardFeatureFlag.allowByValueEmbeddables) {
      throw new Error('redirectToDashboard called with by-value embeddables disabled');
    }

    const state = {
      input: embeddableInput,
      type: LENS_EMBEDDABLE_TYPE,
    };

    const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;
    stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
      state,
      path,
    });
  };

  const redirectToOrigin = (props?: RedirectToOriginProps) => {
    if (!embeddableEditorIncomingState?.originatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    if (stateTransfer && props?.input) {
      const { input, isCopied } = props;
      stateTransfer.navigateToWithEmbeddablePackage(embeddableEditorIncomingState?.originatingApp, {
        state: {
          embeddableId: isCopied ? undefined : embeddableEditorIncomingState.embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input,
        },
      });
    } else {
      coreStart.application.navigateToApp(embeddableEditorIncomingState?.originatingApp);
    }
  };

  // const featureFlagConfig = await getByValueFeatureFlag();
  const EditorRenderer = React.memo(
    (props: { id?: string; history: History<unknown>; editByValue?: boolean }) => {
      const redirectCallback = useCallback(
        (id?: string) => {
          redirectTo(props.history, id);
        },
        [props.history]
      );
      trackUiEvent('loaded');
      return (
        <App
          incomingState={embeddableEditorIncomingState}
          editorFrame={instance}
          initialInput={getInitialInput(props.id, props.editByValue)}
          redirectTo={redirectCallback}
          redirectToOrigin={redirectToOrigin}
          redirectToDashboard={redirectToDashboard}
          onAppLeave={params.onAppLeave}
          setHeaderActionMenu={params.setHeaderActionMenu}
          history={props.history}
          initialContext={
            historyLocationState && historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD
              ? historyLocationState.payload
              : undefined
          }
        />
      );
    }
  );

  const EditorRoute = (
    routeProps: RouteComponentProps<{ id?: string }> & { editByValue?: boolean }
  ) => {
    return (
      <EditorRenderer
        id={routeProps.match.params.id}
        history={routeProps.history}
        editByValue={routeProps.editByValue}
      />
    );
  };

  function NotFound() {
    trackUiEvent('loaded_404');
    return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
  }
  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = params.history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  params.element.classList.add('lnsAppWrapper');
  render(
    <I18nProvider>
      <KibanaContextProvider services={lensServices}>
        <HashRouter>
          <Switch>
            <Route exact path="/edit/:id" component={EditorRoute} />
            <Route
              exact
              path={`/${LENS_EDIT_BY_VALUE}`}
              render={(routeProps) => <EditorRoute {...routeProps} editByValue />}
            />
            <Route exact path="/" component={EditorRoute} />
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
    unlistenParentHistory();
  };
}
