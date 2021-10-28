/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { PreloadedState } from '@reduxjs/toolkit';
import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App } from './app';
import { EditorFrameStart } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE, APP_ID } from '../../common';
import {
  LensEmbeddableInput,
  LensByReferenceInput,
  LensByValueInput,
} from '../embeddable/embeddable';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import {
  makeConfigureStore,
  navigateAway,
  LensRootStore,
  loadInitial,
  LensAppState,
  LensState,
} from '../state_management';
import { getPreloadedState, setState } from '../state_management/lens_slice';
import { getLensInspectorService } from '../lens_inspector_service';

export async function getLensServices(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  attributeService: LensAttributeService
): Promise<LensAppServices> {
  const {
    data,
    inspector,
    navigation,
    embeddable,
    savedObjectsTagging,
    usageCollection,
    fieldFormats,
    spaces,
  } = startDependencies;

  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer();
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

  return {
    data,
    storage,
    inspector: getLensInspectorService(inspector),
    navigation,
    fieldFormats,
    stateTransfer,
    usageCollection,
    savedObjectsTagging,
    attributeService,
    http: coreStart.http,
    chrome: coreStart.chrome,
    overlays: coreStart.overlays,
    uiSettings: coreStart.uiSettings,
    application: coreStart.application,
    notifications: coreStart.notifications,
    savedObjectsClient: coreStart.savedObjects.client,
    presentationUtil: startDependencies.presentationUtil,
    dashboard: startDependencies.dashboard,
    getOriginatingAppName: () => {
      return embeddableEditorIncomingState?.originatingApp
        ? stateTransfer?.getAppNameFromId(embeddableEditorIncomingState.originatingApp)
        : undefined;
    },
    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag: startDependencies.dashboard.dashboardFeatureFlagConfig,
    spaces,
  };
}

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    attributeService: LensAttributeService;
    getPresentationUtilContext: () => FC;
  }
) {
  const { createEditorFrame, attributeService, getPresentationUtilContext } = mountProps;
  const [coreStart, startDependencies] = await core.getStartServices();
  const instance = await createEditorFrame();
  const historyLocationState = params.history.location.state as HistoryLocationState;

  const lensServices = await getLensServices(coreStart, startDependencies, attributeService);

  const { stateTransfer, data, storage } = lensServices;

  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

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

  const redirectToOrigin = (props?: RedirectToOriginProps) => {
    if (!embeddableEditorIncomingState?.originatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    if (stateTransfer && props?.input) {
      const { input, isCopied } = props;
      stateTransfer.navigateToWithEmbeddablePackage(embeddableEditorIncomingState?.originatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
        state: {
          embeddableId: isCopied ? undefined : embeddableEditorIncomingState.embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input,
          searchSessionId: data.search.session.getSessionId(),
        },
      });
    } else {
      coreStart.application.navigateToApp(embeddableEditorIncomingState?.originatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
      });
    }
  };
  const initialContext =
    historyLocationState && historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD
      ? historyLocationState.payload
      : undefined;

  if (embeddableEditorIncomingState?.searchSessionId) {
    data.search.session.continue(embeddableEditorIncomingState.searchSessionId);
  }

  const { datasourceMap, visualizationMap } = instance;
  const storeDeps = {
    lensServices,
    datasourceMap,
    visualizationMap,
    embeddableEditorIncomingState,
    initialContext,
  };
  const emptyState = getPreloadedState(storeDeps) as LensAppState;
  const lensStore: LensRootStore = makeConfigureStore(storeDeps, {
    lens: emptyState,
  } as PreloadedState<LensState>);

  const EditorRenderer = React.memo(
    (props: { id?: string; history: History<unknown>; editByValue?: boolean }) => {
      const redirectCallback = useCallback(
        (id?: string) => {
          redirectTo(props.history, id);
        },
        [props.history]
      );
      trackUiEvent('loaded');
      const initialInput = getInitialInput(props.id, props.editByValue);

      // Clear app-specific filters when navigating to Lens. Necessary because Lens
      // can be loaded without a full page refresh. If the user navigates to Lens from Discover
      // we keep the filters
      if (!initialContext) {
        data.query.filterManager.setAppFilters([]);
      }
      lensStore.dispatch(setState(emptyState));
      lensStore.dispatch(loadInitial({ redirectCallback, initialInput, history: props.history }));

      return (
        <Provider store={lensStore}>
          <App
            incomingState={embeddableEditorIncomingState}
            editorFrame={instance}
            initialInput={initialInput}
            redirectTo={redirectCallback}
            redirectToOrigin={redirectToOrigin}
            onAppLeave={params.onAppLeave}
            setHeaderActionMenu={params.setHeaderActionMenu}
            history={props.history}
            datasourceMap={datasourceMap}
            visualizationMap={visualizationMap}
          />
        </Provider>
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

  const PresentationUtilContext = getPresentationUtilContext();

  render(
    <I18nProvider>
      <KibanaContextProvider services={lensServices}>
        <PresentationUtilContext>
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
        </PresentationUtilContext>
      </KibanaContextProvider>
    </I18nProvider>,
    params.element
  );
  return () => {
    data.search.session.clear();
    unmountComponentAtNode(params.element);
    lensServices.inspector.close();
    unlistenParentHistory();
    lensStore.dispatch(navigateAway());
  };
}
