/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { PreloadedState } from '@reduxjs/toolkit';
import { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { History } from 'history';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import {
  createKbnUrlStateStorage,
  Storage,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';

import { ACTION_VISUALIZE_LENS_FIELD, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ACTION_CONVERT_TO_LENS } from '@kbn/visualizations-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';

import { App } from './app';
import { EditorFrameStart, LensTopNavMenuEntryGenerator, VisualizeEditorContext } from '../types';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { LensPluginStartDependencies } from '../plugin';
import { LENS_EMBEDDABLE_TYPE, LENS_EDIT_BY_VALUE, APP_ID } from '../../common';
import {
  LensEmbeddableInput,
  LensByReferenceInput,
  LensByValueInput,
} from '../embeddable/embeddable';
import { LensAttributeService } from '../lens_attribute_service';
import { LensAppServices, RedirectToOriginProps, HistoryLocationState } from './types';
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
  attributeService: LensAttributeService,
  initialContext?: VisualizeFieldContext | VisualizeEditorContext
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
    share,
    unifiedSearch,
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
    executionContext: coreStart.executionContext,
    http: coreStart.http,
    uiActions: startDependencies.uiActions,
    chrome: coreStart.chrome,
    overlays: coreStart.overlays,
    uiSettings: coreStart.uiSettings,
    application: coreStart.application,
    notifications: coreStart.notifications,
    savedObjectsClient: coreStart.savedObjects.client,
    presentationUtil: startDependencies.presentationUtil,
    dataViewEditor: startDependencies.dataViewEditor,
    dataViewFieldEditor: startDependencies.dataViewFieldEditor,
    dashboard: startDependencies.dashboard,
    charts: startDependencies.charts,
    getOriginatingAppName: () => {
      const originatingApp =
        embeddableEditorIncomingState?.originatingApp ?? initialContext?.originatingApp;
      return originatingApp ? stateTransfer?.getAppNameFromId(originatingApp) : undefined;
    },
    dataViews: startDependencies.dataViews,
    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag: startDependencies.dashboard.dashboardFeatureFlagConfig,
    spaces,
    share,
    unifiedSearch,
    docLinks: coreStart.docLinks,
  };
}

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    attributeService: LensAttributeService;
    getPresentationUtilContext: () => FC;
    topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
  }
) {
  const {
    createEditorFrame,
    attributeService,
    getPresentationUtilContext,
    topNavMenuEntryGenerators,
  } = mountProps;
  const [[coreStart, startDependencies], instance] = await Promise.all([
    core.getStartServices(),
    createEditorFrame(),
  ]);
  const historyLocationState = params.history.location.state as HistoryLocationState;

  // get state from location, used for navigating from Visualize/Discover to Lens
  const initialContext =
    historyLocationState &&
    (historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD ||
      historyLocationState.type === ACTION_CONVERT_TO_LENS)
      ? historyLocationState.payload
      : undefined;

  const lensServices = await getLensServices(
    coreStart,
    startDependencies,
    attributeService,
    initialContext
  );

  const { stateTransfer, data } = lensServices;

  const embeddableEditorIncomingState = stateTransfer?.getIncomingEditorState(APP_ID);

  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);
  if (!lensServices.application.capabilities.visualize.save) {
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
    const contextOriginatingApp =
      initialContext && 'originatingApp' in initialContext ? initialContext.originatingApp : null;
    const originatingApp = embeddableEditorIncomingState?.originatingApp ?? contextOriginatingApp;
    if (!originatingApp) {
      throw new Error('redirectToOrigin called without an originating app');
    }
    let embeddableId = embeddableEditorIncomingState?.embeddableId;
    if (initialContext && 'embeddableId' in initialContext) {
      embeddableId = initialContext.embeddableId;
    }
    if (stateTransfer && props?.input) {
      const { input, isCopied } = props;
      stateTransfer.navigateToWithEmbeddablePackage(originatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
        state: {
          embeddableId: isCopied ? undefined : embeddableId,
          type: LENS_EMBEDDABLE_TYPE,
          input,
          searchSessionId: data.search.session.getSessionId(),
        },
      });
    } else {
      coreStart.application.navigateToApp(originatingApp, {
        path: embeddableEditorIncomingState?.originatingPath,
      });
    }
  };

  if (historyLocationState && historyLocationState.type === ACTION_VISUALIZE_LENS_FIELD) {
    // remove originatingApp from context when visualizing a field in Lens
    // so Lens does not try to return to the original app on Save
    // see https://github.com/elastic/kibana/issues/128695
    delete initialContext?.originatingApp;
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
  };
  const lensStore: LensRootStore = makeConfigureStore(storeDeps, {
    lens: getPreloadedState(storeDeps) as LensAppState,
  } as unknown as PreloadedState<LensState>);

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
      const initialInput = useMemo(
        () => getInitialInput(props.id, props.editByValue),
        [props.editByValue, props.id]
      );
      const initCallback = useCallback(() => {
        // Clear app-specific filters when navigating to Lens. Necessary because Lens
        // can be loaded without a full page refresh. If the user navigates to Lens from Discover
        // we keep the filters
        if (!initialContext) {
          data.query.filterManager.setAppFilters([]);
        }
        lensStore.dispatch(setState(getPreloadedState(storeDeps) as LensAppState));
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
        };
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
            contextOriginatingApp={historyLocationState?.originatingApp}
            topNavMenuEntryGenerators={topNavMenuEntryGenerators}
            theme$={core.theme.theme$}
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

  const PresentationUtilContext = getPresentationUtilContext();

  render(
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
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
      </I18nProvider>
    </KibanaThemeProvider>,
    params.element
  );
  return () => {
    data.search.session.clear();
    unmountComponentAtNode(params.element);
    lensServices.inspector.close();
    unlistenParentHistory();
    lensStore.dispatch(navigateAway());
    stateTransfer.clearEditorState?.(APP_ID);
  };
}
