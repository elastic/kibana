/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { NotificationsStart } from 'kibana/public';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { Document, injectFilterReferences } from '../persistence';
import { NativeRenderer } from '../native_renderer';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  esFilters,
  IndexPattern as IndexPatternInstance,
  IndexPatternsContract,
  syncQueryStateWithUrl,
} from '../../../../../src/plugins/data/public';
import { LENS_EMBEDDABLE_TYPE } from '../../common';
import { LensAppProps, LensAppServices, LensAppState, LensTopNavMode } from './types';
import { getLensTopNavConfig } from './lens_top_nav';

export function App({
  editorFrame,
  redirectTo,
  redirectToOrigin,
  onAppLeave,
  history,
  initialInput,
}: LensAppProps) {
  const {
    data,
    application,
    attributeService,
    uiSettings,
    notifications,
    navigation,
    incomingState,
  } = useKibana<LensAppServices>().services;

  const [state, setState] = useState<LensAppState>(() => {
    const currentRange = data.query.timefilter.timefilter.getTime();
    return {
      isLoading: !!initialInput,
      isSaveModalVisible: false,
      indexPatternsForTopNav: [],
      query: data.query.queryString.getDefaultQuery(),
      dateRange: {
        fromDate: currentRange.from,
        toDate: currentRange.to,
      },
      filters: data.query.filterManager.getFilters(),
      indicateNoData: false,
      isSaveable: false,
    };
  });

  const { lastKnownDoc } = state;

  const showNoDataPopover = useCallback(() => {
    setState((prevState) => ({ ...prevState, indicateNoData: true }));
  }, [setState]);

  useEffect(() => {
    if (state.indicateNoData) {
      setState((prevState) => ({ ...prevState, indicateNoData: false }));
    }
  }, [
    setState,
    state.indicateNoData,
    state.query,
    state.filters,
    state.dateRange,
    state.indexPatternsForTopNav,
  ]);

  const onError = useCallback(
    (e: { message: string }) =>
      notifications.toasts.addDanger({
        title: e.message,
      }),
    [notifications.toasts]
  );

  const getLastKnownDocWithoutPinnedFilters = useCallback(
    function () {
      if (!lastKnownDoc) return undefined;
      const [pinnedFilters, appFilters] = _.partition(
        injectFilterReferences(lastKnownDoc.state?.filters || [], lastKnownDoc.references),
        esFilters.isFilterPinned
      );
      return pinnedFilters?.length
        ? {
            ...lastKnownDoc,
            state: {
              ...lastKnownDoc.state,
              filters: appFilters,
            },
          }
        : lastKnownDoc;
    },
    [lastKnownDoc]
  );

  const setActiveDocument = useCallback(
    (doc: Document) => {
      getAllIndexPatterns(
        _.uniq(doc.references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id)),
        data.indexPatterns,
        notifications
      )
        .then((indexPatterns) => {
          // Don't overwrite any pinned filters
          data.query.filterManager.setAppFilters(
            injectFilterReferences(doc.state.filters, doc.references)
          );
          setState((s) => ({
            ...s,
            isLoading: false,
            persistedDoc: doc,
            lastKnownDoc: doc,
            query: doc.state.query,
            indexPatternsForTopNav: indexPatterns,
          }));
        })
        .catch((e) => {
          setState((s) => ({ ...s, isLoading: false }));

          redirectTo();
        });
    },
    [notifications, data.indexPatterns, data.query.filterManager, redirectTo]
  );

  useEffect(() => {
    // Clear app-specific filters when navigating to Lens. Necessary because Lens
    // can be loaded without a full page refresh
    data.query.filterManager.setAppFilters([]);

    const filterSubscription = data.query.filterManager.getUpdates$().subscribe({
      next: () => {
        setState((s) => ({ ...s, filters: data.query.filterManager.getFilters() }));
        trackUiEvent('app_filters_updated');
      },
    });

    const timeSubscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
      next: () => {
        const currentRange = data.query.timefilter.timefilter.getTime();
        setState((s) => ({
          ...s,
          dateRange: {
            fromDate: currentRange.from,
            toDate: currentRange.to,
          },
        }));
      },
    });

    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(notifications.toasts),
    });
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );

    return () => {
      stopSyncingQueryServiceStateWithUrl();
      filterSubscription.unsubscribe();
      timeSubscription.unsubscribe();
    };
  }, [
    data.query.filterManager,
    data.query.timefilter.timefilter,
    notifications.toasts,
    uiSettings,
    data.query,
    history,
  ]);

  useEffect(() => {
    onAppLeave((actions) => {
      // Confirm when the user has made any changes to an existing doc
      // or when the user has configured something without saving
      if (
        application.capabilities.visualize.save &&
        !_.isEqual(state.persistedDoc?.state, getLastKnownDocWithoutPinnedFilters()?.state) &&
        (state.isSaveable || state.persistedDoc)
      ) {
        return actions.confirm(
          i18n.translate('xpack.lens.app.unsavedWorkMessage', {
            defaultMessage: 'Leave Lens with unsaved work?',
          }),
          i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          })
        );
      } else {
        return actions.default();
      }
    });
  }, [
    lastKnownDoc,
    onAppLeave,
    state.persistedDoc,
    state.isSaveable,
    application.capabilities.visualize.save,
    getLastKnownDocWithoutPinnedFilters,
  ]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  // useEffect(() => {
  //   core.chrome.setBreadcrumbs([
  //     ...(state.originatingApp && getAppNameFromId
  //       ? [
  //           {
  //             onClick: () => {
  //               core.application.navigateToApp(state.originatingApp!);
  //             },
  //             text: getAppNameFromId(state.originatingApp),
  //           },
  //         ]
  //       : []),
  //     ...(!state.isByValueMode
  //       ? [
  //           {
  //             href: core.http.basePath.prepend(`/app/visualize#/`),
  //             onClick: (e) => {
  //               core.application.navigateToApp('visualize', { path: '/' });
  //               e.preventDefault();
  //             },
  //             text: i18n.translate('xpack.lens.breadcrumbsTitle', {
  //               defaultMessage: 'Visualize',
  //             }),
  //           } as EuiBreadcrumb,
  //         ]
  //       : []),
  //     {
  //       text: state.persistedDoc
  //         ? state.isByValueMode
  //           ? i18n.translate('xpack.lens.breadcrumbsByValue', {
  //               defaultMessage: 'Edit Visualization',
  //             })
  //           : state.persistedDoc.title
  //         : i18n.translate('xpack.lens.breadcrumbsCreate', { defaultMessage: 'Create' }),
  //     },
  //   ]);
  // }, [
  //   core.application,
  //   core.chrome,
  //   core.http.basePath,
  //   state.persistedDoc,
  //   state.originatingApp,
  //   state.isByValueMode,
  //   redirectTo,
  //   getAppNameFromId,
  // ]);

  useEffect(() => {
    if (!initialInput) {
      return;
    }
    attributeService.unwrapAttributes(initialInput).then((attributes) =>
      setActiveDocument({
        ...attributes,
        type: LENS_EMBEDDABLE_TYPE,
      })
    );
  }, [initialInput, attributeService, setActiveDocument]);

  const runSave = async (
    saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
      returnToOrigin: boolean;
      onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
      newDescription?: string;
    },
    saveToLibrary: boolean = false
  ) => {
    // if (!lastKnownDoc) {
    //   return;
    // }
    // if (saveProps.newCopyOnSave && !state.isByValueMode) {
    //   if (embeddableEditorIncomingState?.embeddableId) {
    //     embeddableEditorIncomingState.embeddableId = undefined;
    //   }
    // }
    // const doc = {
    //   ...getLastKnownDocWithoutPinnedFilters()!,
    //   description: saveProps.newDescription,
    //   savedObjectId: saveProps.newCopyOnSave ? undefined : lastKnownDoc.savedObjectId,
    //   title: saveProps.newTitle,
    // };
    // const addedToLibrary = state.isByValueMode && saveToLibrary;
    // const newlyCreated =
    //   saveProps.newCopyOnSave || addedToLibrary || (!savedObjectId && !state.isByValueMode);
    // if (state.isByValueMode && !saveToLibrary && redirectToOrigin) {
    //   await setState((s: LensAppState) => ({ ...s, persistedDoc: doc }));
    //   const { savedObjectId: id, type, ...attributes } = doc;
    //   redirectToOrigin({ attributes } as LensByValueInput);
    // } else {
    //   await checkForDuplicateTitle(
    //     {
    //       ...doc,
    //       copyOnSave: saveProps.newCopyOnSave,
    //       lastSavedTitle: lastKnownDoc.title,
    //       getEsType: () => 'lens',
    //       getDisplayName: () =>
    //         i18n.translate('xpack.lens.app.saveModalType', {
    //           defaultMessage: 'Lens visualization',
    //         }),
    //     },
    //     saveProps.isTitleDuplicateConfirmed,
    //     saveProps.onTitleDuplicate,
    //     {
    //       savedObjectsClient: core.savedObjects.client,
    //       overlays: core.overlays,
    //     }
    //   );
    //   docStorage
    //     .save(doc)
    //     .then(({ savedObjectId: newSavedObjectId }) => {
    //       // Prevents unnecessary network request and disables save button
    //       const newDoc: Document = { ...doc, savedObjectId: newSavedObjectId };
    //       const currentOriginatingApp = state.originatingApp;
    //       setState((s) => ({
    //         ...s,
    //         isByValueMode: false,
    //         isSaveModalVisible: false,
    //         originatingApp:
    //           newlyCreated && !saveProps.returnToOrigin ? undefined : currentOriginatingApp,
    //         persistedDoc: newDoc,
    //         lastKnownDoc: newDoc,
    //       }));
    //       if (saveProps.returnToOrigin && redirectToOrigin) {
    //         redirectToOrigin(
    //           newlyCreated
    //             ? ({ savedObjectId: newSavedObjectId } as LensByReferenceInput)
    //             : undefined
    //         );
    //       } else if (savedObjectId !== newSavedObjectId) {
    //         redirectTo(newSavedObjectId);
    //       }
    //     })
    //     .catch((e) => {
    //       // eslint-disable-next-line no-console
    //       console.dir(e);
    //       trackUiEvent('save_failed');
    //       core.notifications.toasts.addDanger(
    //         i18n.translate('xpack.lens.app.docSavingError', {
    //           defaultMessage: 'Error saving document',
    //         })
    //       );
    //       setState((s) => ({ ...s, isSaveModalVisible: false }));
    //     });
    // }
  };

  const { TopNavMenu } = navigation.ui;

  const savingPermitted = Boolean(state.isSaveable && application.capabilities.visualize.save);
  const topNavConfig = getLensTopNavConfig({
    topNavMode: LensTopNavMode.UNLINKED,
    savingPermitted,
    actions: {
      saveAndReturn: () => {
        if (savingPermitted && lastKnownDoc) {
          runSave({
            newTitle: lastKnownDoc.title,
            newCopyOnSave: false,
            // newCopyOnSave: !editFromContainerMode || state.isByValueMode,
            isTitleDuplicateConfirmed: false,
            returnToOrigin: true,
          });
        }
      },
      showSaveModal: () => {
        if (savingPermitted) {
          setState((s) => ({ ...s, isSaveModalVisible: true }));
        }
      },
      cancel: () => {
        if (redirectToOrigin) {
          redirectToOrigin();
        }
      },
    },
  });

  return (
    <>
      <div className="lnsApp">
        <div className="lnsApp__header">
          <TopNavMenu
            config={topNavConfig}
            showSearchBar={true}
            showDatePicker={true}
            showQueryBar={true}
            showFilterBar={true}
            indexPatterns={state.indexPatternsForTopNav}
            showSaveQuery={Boolean(application.capabilities.visualize.saveQuery)}
            savedQuery={state.savedQuery}
            data-test-subj="lnsApp_topNav"
            screenTitle={'lens'}
            appName={'lens'}
            onQuerySubmit={(payload) => {
              const { dateRange, query } = payload;
              if (
                dateRange.from !== state.dateRange.fromDate ||
                dateRange.to !== state.dateRange.toDate
              ) {
                data.query.timefilter.timefilter.setTime(dateRange);
                trackUiEvent('app_date_change');
              } else {
                trackUiEvent('app_query_change');
              }
              setState((s) => ({
                ...s,
                dateRange: {
                  fromDate: dateRange.from,
                  toDate: dateRange.to,
                },
                query: query || s.query,
              }));
            }}
            onSaved={(savedQuery) => {
              setState((s) => ({ ...s, savedQuery }));
            }}
            onSavedQueryUpdated={(savedQuery) => {
              const savedQueryFilters = savedQuery.attributes.filters || [];
              const globalFilters = data.query.filterManager.getGlobalFilters();
              data.query.filterManager.setFilters([...globalFilters, ...savedQueryFilters]);
              setState((s) => ({
                ...s,
                savedQuery: { ...savedQuery }, // Shallow query for reference issues
                dateRange: savedQuery.attributes.timefilter
                  ? {
                      fromDate: savedQuery.attributes.timefilter.from,
                      toDate: savedQuery.attributes.timefilter.to,
                    }
                  : s.dateRange,
              }));
            }}
            onClearSavedQuery={() => {
              data.query.filterManager.setFilters(data.query.filterManager.getGlobalFilters());
              setState((s) => ({
                ...s,
                savedQuery: undefined,
                filters: data.query.filterManager.getGlobalFilters(),
                query: data.query.queryString.getDefaultQuery(),
              }));
            }}
            query={state.query}
            dateRangeFrom={state.dateRange.fromDate}
            dateRangeTo={state.dateRange.toDate}
            indicateNoData={state.indicateNoData}
          />
        </div>
        );
        {(!state.isLoading || state.persistedDoc) && (
          <NativeRenderer
            className="lnsApp__frame"
            render={editorFrame.mount}
            nativeProps={{
              dateRange: state.dateRange,
              query: state.query,
              filters: state.filters,
              savedQuery: state.savedQuery,
              doc: state.persistedDoc,
              onError,
              showNoDataPopover,
              onChange: ({ filterableIndexPatterns, doc, isSaveable }) => {
                if (isSaveable !== state.isSaveable) {
                  setState((s) => ({ ...s, isSaveable }));
                }
                if (!_.isEqual(state.persistedDoc, doc)) {
                  setState((s) => ({ ...s, lastKnownDoc: doc }));
                }

                // Update the cached index patterns if the user made a change to any of them
                if (
                  state.indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
                  filterableIndexPatterns.some(
                    (id) =>
                      !state.indexPatternsForTopNav.find((indexPattern) => indexPattern.id === id)
                  )
                ) {
                  getAllIndexPatterns(
                    filterableIndexPatterns,
                    data.indexPatterns,
                    notifications
                  ).then((indexPatterns) => {
                    if (indexPatterns) {
                      setState((s) => ({ ...s, indexPatternsForTopNav: indexPatterns }));
                    }
                  });
                }
              },
            }}
          />
        )}
      </div>
      {lastKnownDoc && state.isSaveModalVisible && (
        <SavedObjectSaveModalOrigin
          originatingApp={incomingState?.originatingApp}
          onSave={(props) => runSave(props, true)}
          onClose={() => setState((s) => ({ ...s, isSaveModalVisible: false }))}
          getAppNameFromId={getAppNameFromId}
          documentInfo={{
            id: state.isByValueMode ? undefined : lastKnownDoc.savedObjectId,
            title: lastKnownDoc.title || '',
            description: lastKnownDoc.description || '',
          }}
          objectType={i18n.translate('xpack.lens.app.saveModalType', {
            defaultMessage: 'Lens visualization',
          })}
          data-test-subj="lnsApp_saveModalOrigin"
        />
      )}
    </>
  );
}

export async function getAllIndexPatterns(
  ids: string[],
  indexPatternsService: IndexPatternsContract,
  notifications: NotificationsStart
): Promise<IndexPatternInstance[]> {
  try {
    return await Promise.all(ids.map((id) => indexPatternsService.get(id)));
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.indexPatternLoadingError', {
        defaultMessage: 'Error loading index patterns',
      })
    );

    throw new Error(e);
  }
}
