/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { HashRouter, Routes, Route } from '@kbn/shared-ux-router';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import {
  createKbnUrlStateStorage,
  Storage,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';

import { ACTION_VISUALIZE_LENS_FIELD, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ACTION_CONVERT_TO_LENS } from '@kbn/visualizations-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EuiLoadingSpinner } from '@elastic/eui';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';

import { App } from './app';
import { EditorFrameStart, LensTopNavMenuEntryGenerator, VisualizeEditorContext } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE, APP_ID } from '../../common/constants';
import { LensAttributesService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
import {
  makeConfigureStore,
  navigateAway,
  LensRootStore,
  loadInitial,
  setState,
} from '../state_management';
import { getPreloadedState } from '../state_management/lens_slice';
import { getLensInspectorService } from '../lens_inspector_service';
import {
  LensAppLocator,
  LENS_SHARE_STATE_ACTION,
  MainHistoryLocationState,
} from '../../common/locator/locator';
import { SavedObjectIndexStore } from '../persistence';
import { LensSerializedState } from '../react_embeddable/types';

function getInitialContext(history: AppMountParameters['history']) {
  const historyLocationState = history.location.state as
    | MainHistoryLocationState
    | HistoryLocationState
    | undefined;

  if (historyLocationState) {
    if (historyLocationState.type === LENS_SHARE_STATE_ACTION) {
      return {
        contextType: historyLocationState.type,
        initialStateFromLocator: historyLocationState.payload,
      };
    }
    // get state from location, used for navigating from Visualize/Discover to Lens
    if ([ACTION_VISUALIZE_LENS_FIELD, ACTION_CONVERT_TO_LENS].includes(historyLocationState.type)) {
      return {
        contextType: historyLocationState.type,
        initialContext: historyLocationState.payload,
        originatingApp: historyLocationState.originatingApp,
      };
    }
  }
}

export async function getLensServices(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  attributeService: LensAttributesService,
  initialContext?: VisualizeFieldContext | VisualizeEditorContext,
  locator?: LensAppLocator
): Promise<LensAppServices> {
  const {
    data,
    inspector,
    navigation,
    embeddable,
    eventAnnotation,
    savedObjectsTagging,
    usageCollection,
    fieldFormats,
    spaces,
    share,
    unifiedSearch,
    serverless,
    contentManagement,
  } = startDependencies;

  const storage = new Storage(localStorage);
  const stateTransfer = embeddable?.getStateTransfer();
  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);
  const eventAnnotationService = await eventAnnotation.getService();

  return {
    data,
    storage,
    inspector: getLensInspectorService(inspector),
    navigation,
    contentManagement,
    fieldFormats,
    stateTransfer,
    usageCollection,
    savedObjectsTagging,
    attributeService,
    eventAnnotationService,
    uiActions: startDependencies.uiActions,
    savedObjectStore: new SavedObjectIndexStore(startDependencies.contentManagement),
    presentationUtil: startDependencies.presentationUtil,
    dataViewEditor: startDependencies.dataViewEditor,
    dataViewFieldEditor: startDependencies.dataViewFieldEditor,
    charts: startDependencies.charts,
    getOriginatingAppName: () => {
      const originatingApp =
        embeddableEditorIncomingState?.originatingApp ?? initialContext?.originatingApp;
      return originatingApp ? stateTransfer?.getAppNameFromId(originatingApp) : undefined;
    },
    dataViews: startDependencies.dataViews,
    spaces,
    share,
    unifiedSearch,
    locator,
    serverless,
    ...coreStart,
  };
}

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    attributeService: LensAttributesService;
    topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
    locator?: LensAppLocator;
  }
) {
  const { createEditorFrame, attributeService, topNavMenuEntryGenerators, locator } = mountProps;
  const [[coreStart, startDependencies], instance] = await Promise.all([
    core.getStartServices(),
    createEditorFrame(),
  ]);

  const { contextType, initialContext, initialStateFromLocator, originatingApp } =
    getInitialContext(params.history) || {};

  const lensServices = await getLensServices(
    coreStart,
    startDependencies,
    attributeService,
    initialContext,
    locator
  );

  const { stateTransfer, data, savedObjectStore, share } = lensServices;

  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);
  if (!lensServices.application.capabilities.visualize_v2.save) {
    coreStart.chrome.setBadge({
      text: i18n.translate('xpack.lens.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('xpack.lens.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save visualizations to the library',
      }),
      iconType: 'glasses',
    });
  }
  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.lens.pageTitle', { defaultMessage: 'Lens' })
  );

  const getInitialInput = (id?: string, editByValue?: boolean): LensSerializedState | undefined => {
    if (editByValue) {
      return embeddableEditorIncomingState?.valueInput as LensSerializedState;
    }
    if (id) {
      return { savedObjectId: id } as LensSerializedState;
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
    const contextOriginatingApp =
      initialContext && 'originatingApp' in initialContext ? initialContext.originatingApp : null;
    const mergedOriginatingApp =
      embeddableEditorIncomingState?.originatingApp ?? contextOriginatingApp;
    if (!mergedOriginatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    let embeddableId = embeddableEditorIncomingState?.embeddableId;
    if (initialContext && 'embeddableId' in initialContext) {
      embeddableId = initialContext.embeddableId;
    }
    if (stateTransfer && props?.state) {
      const { state, isCopied } = props;
      stateTransfer.navigateToWithEmbeddablePackage(mergedOriginatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
        state: {
          embeddableId: isCopied ? undefined : embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input: { ...state, savedObject: state.savedObjectId },
          searchSessionId: data.search.session.getSessionId(),
        },
      });
    } else {
      coreStart.application.navigateToApp(mergedOriginatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
      });
    }
  };

  if (contextType === ACTION_VISUALIZE_LENS_FIELD && initialContext?.originatingApp) {
    // remove originatingApp from context when visualizing a field in Lens
    // so Lens does not try to return to the original app on Save
    // see https://github.com/elastic/kibana/issues/128695
    delete initialContext.originatingApp;
  }

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
    initialStateFromLocator,
  };
  const lensStore: LensRootStore = makeConfigureStore(storeDeps);

  const EditorRenderer = React.memo(
    (props: { id?: string; history: History<unknown>; editByValue?: boolean }) => {
      const [editorState, setEditorState] = useState<'loading' | 'no_data' | 'data'>('loading');

      useEffect(() => {
        const kbnUrlStateStorage = createKbnUrlStateStorage({
          history: props.history,
          useHash: lensServices.uiSettings.get('state:storeInSessionStorage'),
          ...withNotifyOnErrors(lensServices.notifications.toasts),
        });
        const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
          data.query,
          kbnUrlStateStorage
        );

        return () => {
          stopSyncingQueryServiceStateWithUrl();
        };
      }, [props.history]);
      const redirectCallback = useCallback(
        (id?: string) => {
          redirectTo(props.history, id);
        },
        [props.history]
      );
      const initialInput = useMemo(() => {
        return getInitialInput(props.id, props.editByValue);
      }, [props.editByValue, props.id]);

      const initCallback = useCallback(() => {
        // Clear app-specific filters when navigating to Lens. Necessary because Lens
        // can be loaded without a full page refresh.
        // If the user navigates to Lens from Discover, or comes from a Lens share link we keep the filters
        if (!initialContext) {
          data.query.filterManager.setAppFilters([]);
        }
        // if user comes from a dashboard to convert a legacy viz to a Lens chart
        // we clear up the dashboard filters and query
        if (initialContext && 'isEmbeddable' in initialContext && initialContext.isEmbeddable) {
          data.query.filterManager.setAppFilters([]);
          data.query.queryString.clearQuery();
        }
        lensStore.dispatch(setState(getPreloadedState(storeDeps)));
        lensStore.dispatch(loadInitial({ redirectCallback, initialInput, history: props.history }));
      }, [initialInput, props.history, redirectCallback]);
      useEffect(() => {
        (async () => {
          const hasUserDataView = await data.dataViews.hasData.hasUserDataView().catch(() => false);
          if (!hasUserDataView) {
            setEditorState('no_data');
            return;
          }
          setEditorState('data');
          initCallback();
        })();
      }, [initCallback, initialInput, props.history, redirectCallback]);

      if (editorState === 'loading') {
        return <EuiLoadingSpinner />;
      }

      if (editorState === 'no_data') {
        const analyticsServices = {
          coreStart,
          dataViews: data.dataViews,
          dataViewEditor: startDependencies.dataViewEditor,
          share,
        };
        const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
        const AnalyticsNoDataPageKibanaProvider = withSuspense(
          React.lazy(() =>
            importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
              return { default: NoDataProvider };
            })
          )
        );
        const AnalyticsNoDataPage = withSuspense(
          React.lazy(() =>
            importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
              return { default: NoDataPage };
            })
          )
        );

        return (
          <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
            <AnalyticsNoDataPage
              onDataViewCreated={() => {
                setEditorState('data');
                initCallback();
              }}
            />
          </AnalyticsNoDataPageKibanaProvider>
        );
      }

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
            initialContext={initialContext}
            contextOriginatingApp={originatingApp}
            topNavMenuEntryGenerators={topNavMenuEntryGenerators}
            theme$={core.theme.theme$}
            coreStart={coreStart}
            savedObjectStore={savedObjectStore}
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
    return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
  }
  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = params.history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  params.element.classList.add('lnsAppWrapper');

  render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={lensServices}>
        <HashRouter>
          <Routes>
            <Route exact path="/edit/:id" component={EditorRoute} />
            <Route
              exact
              path={`/${LENS_EDIT_BY_VALUE}`}
              render={(routeProps) => <EditorRoute {...routeProps} editByValue />}
            />
            <Route exact path="/" component={EditorRoute} />
            <Route path="/" component={NotFound} />
          </Routes>
        </HashRouter>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    params.element
  );
  return () => {
    data.search.session.clear();
    unmountComponentAtNode(params.element);
    lensServices.inspector.closeInspector();
    unlistenParentHistory();
    lensStore.dispatch(navigateAway());
    stateTransfer.clearEditorState?.(APP_ID);
  };
}
