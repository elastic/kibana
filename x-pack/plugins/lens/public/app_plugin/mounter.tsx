/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
import { Provider } from 'react-redux';
import { isEqual } from 'lodash';
import { EmbeddableEditorState } from 'src/plugins/embeddable/public';
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
} from '../editor_frame_service/embeddable/embeddable';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import {
  makeConfigureStore,
  navigateAway,
  getPreloadedState,
  LensRootStore,
  setState,
} from '../state_management';
import { getResolvedDateRange } from '../utils';
import { getLastKnownDoc } from './save_modal_container';

export async function getLensServices(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  attributeService: () => Promise<LensAttributeService>
): Promise<LensAppServices> {
  const { data, navigation, embeddable, savedObjectsTagging, usageCollection } = startDependencies;

  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer();
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

  return {
    data,
    storage,
    navigation,
    stateTransfer,
    usageCollection,
    savedObjectsTagging,
    attributeService: await attributeService(),
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
  };
}

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    attributeService: () => Promise<LensAttributeService>;
    getPresentationUtilContext: () => Promise<FC>;
  }
) {
  const { createEditorFrame, attributeService, getPresentationUtilContext } = mountProps;
  const [coreStart, startDependencies] = await core.getStartServices();
  const instance = await createEditorFrame();
  const historyLocationState = params.history.location.state as HistoryLocationState;

  const lensServices = await getLensServices(coreStart, startDependencies, attributeService);

  const { stateTransfer, data, storage, dashboardFeatureFlag } = lensServices;

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
  const initialContext =
    historyLocationState && historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD
      ? historyLocationState.payload
      : undefined;

  // Clear app-specific filters when navigating to Lens. Necessary because Lens
  // can be loaded without a full page refresh. If the user navigates to Lens from Discover
  // we keep the filters
  if (!initialContext) {
    data.query.filterManager.setAppFilters([]);
  }
  const preloadedState = getPreloadedState({
    query: data.query.queryString.getQuery(),
    // Do not use app-specific filters from previous app,
    // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
    filters: !initialContext
      ? data.query.filterManager.getGlobalFilters()
      : data.query.filterManager.getFilters(),
    searchSessionId: data.search.session.getSessionId(),
    resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
    isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
  });

  const lensStore: LensRootStore = makeConfigureStore(preloadedState, { data });

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
      loadDocument(
        redirectCallback,
        initialInput,
        lensServices,
        lensStore,
        embeddableEditorIncomingState,
        dashboardFeatureFlag
      );
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
            initialContext={initialContext}
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

  const PresentationUtilContext = await getPresentationUtilContext();

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
    unmountComponentAtNode(params.element);
    unlistenParentHistory();
    lensStore.dispatch(navigateAway());
  };
}

export function loadDocument(
  redirectCallback: (savedObjectId?: string) => void,
  initialInput: LensEmbeddableInput | undefined,
  lensServices: LensAppServices,
  lensStore: LensRootStore,
  embeddableEditorIncomingState: EmbeddableEditorState | undefined,
  dashboardFeatureFlag: DashboardFeatureFlagConfig
) {
  const { attributeService, chrome, notifications, data } = lensServices;
  const { persistedDoc } = lensStore.getState().app;
  if (
    !initialInput ||
    (attributeService.inputIsRefType(initialInput) &&
      initialInput.savedObjectId === persistedDoc?.savedObjectId)
  ) {
    return;
  }
  lensStore.dispatch(setState({ isAppLoading: true }));

  getLastKnownDoc({
    initialInput,
    attributeService,
    data,
    chrome,
    notifications,
  }).then(
    (newState) => {
      if (newState) {
        const { doc, indexPatterns } = newState;
        const currentSessionId = data.search.session.getSessionId();
        lensStore.dispatch(
          setState({
            query: doc.state.query,
            isAppLoading: false,
            indexPatternsForTopNav: indexPatterns,
            lastKnownDoc: doc,
            searchSessionId:
              dashboardFeatureFlag.allowByValueEmbeddables &&
              Boolean(embeddableEditorIncomingState?.originatingApp) &&
              !(initialInput as LensByReferenceInput)?.savedObjectId &&
              currentSessionId
                ? currentSessionId
                : data.search.session.start(),
            ...(!isEqual(persistedDoc, doc) ? { persistedDoc: doc } : null),
          })
        );
      } else {
        redirectCallback();
      }
    },
    () => {
      lensStore.dispatch(
        setState({
          isAppLoading: false,
        })
      );

      redirectCallback();
    }
  );
}
