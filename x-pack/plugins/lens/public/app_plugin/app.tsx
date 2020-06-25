/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { AppMountContext, AppMountParameters, NotificationsStart } from 'kibana/public';
import { History } from 'history';
import {
  Query,
  DataPublicPluginStart,
  syncQueryStateWithUrl,
} from '../../../../../src/plugins/data/public';
import {
  createKbnUrlStateStorage,
  IStorageWrapper,
} from '../../../../../src/plugins/kibana_utils/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { Document, SavedObjectStore } from '../persistence';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  esFilters,
  Filter,
  IndexPattern as IndexPatternInstance,
  IndexPatternsContract,
  SavedQuery,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';

interface State {
  indicateNoData: boolean;
  isLoading: boolean;
  isSaveModalVisible: boolean;
  indexPatternsForTopNav: IndexPatternInstance[];
  persistedDoc?: Document;
  lastKnownDoc?: Document;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
}

export function App({
  editorFrame,
  data,
  core,
  storage,
  docId,
  docStorage,
  redirectTo,
  originatingApp,
  navigation,
  onAppLeave,
  history,
}: {
  editorFrame: EditorFrameInstance;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  core: AppMountContext['core'];
  storage: IStorageWrapper;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (id?: string, returnToOrigin?: boolean, newlyCreated?: boolean) => void;
  originatingApp?: string | undefined;
  onAppLeave: AppMountParameters['onAppLeave'];
  history: History;
}) {
  const language =
    storage.get('kibana.userQueryLanguage') ||
    core.uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE);

  const [state, setState] = useState<State>(() => {
    const currentRange = data.query.timefilter.timefilter.getTime();
    return {
      isLoading: !!docId,
      isSaveModalVisible: false,
      indexPatternsForTopNav: [],
      query: { query: '', language },
      dateRange: {
        fromDate: currentRange.from,
        toDate: currentRange.to,
      },
      filters: [],
      indicateNoData: false,
    };
  });

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

  const { lastKnownDoc } = state;

  const isSaveable =
    lastKnownDoc &&
    lastKnownDoc.expression &&
    lastKnownDoc.expression.length > 0 &&
    core.application.capabilities.visualize.save;

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
      useHash: core.uiSettings.get('state:storeInSessionStorage'),
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
  }, [data.query.filterManager, data.query.timefilter.timefilter]);

  useEffect(() => {
    onAppLeave((actions) => {
      // Confirm when the user has made any changes to an existing doc
      // or when the user has configured something without saving
      if (
        core.application.capabilities.visualize.save &&
        (state.persistedDoc?.expression
          ? !_.isEqual(lastKnownDoc?.expression, state.persistedDoc.expression)
          : lastKnownDoc?.expression)
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
  }, [lastKnownDoc, onAppLeave, state.persistedDoc, core.application.capabilities.visualize.save]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        href: core.http.basePath.prepend(`/app/visualize#/`),
        onClick: (e) => {
          core.application.navigateToApp('visualize', { path: '/' });
          e.preventDefault();
        },
        text: i18n.translate('xpack.lens.breadcrumbsTitle', {
          defaultMessage: 'Visualize',
        }),
      },
      {
        text: state.persistedDoc
          ? state.persistedDoc.title
          : i18n.translate('xpack.lens.breadcrumbsCreate', { defaultMessage: 'Create' }),
      },
    ]);
  }, [core.application, core.chrome, core.http.basePath, state.persistedDoc]);

  useEffect(() => {
    if (docId && (!state.persistedDoc || state.persistedDoc.id !== docId)) {
      setState((s) => ({ ...s, isLoading: true }));
      docStorage
        .load(docId)
        .then((doc) => {
          getAllIndexPatterns(
            doc.state.datasourceMetaData.filterableIndexPatterns,
            data.indexPatterns,
            core.notifications
          )
            .then((indexPatterns) => {
              // Don't overwrite any pinned filters
              data.query.filterManager.setAppFilters(doc.state.filters);
              setState((s) => ({
                ...s,
                isLoading: false,
                persistedDoc: doc,
                lastKnownDoc: doc,
                query: doc.state.query,
                indexPatternsForTopNav: indexPatterns,
              }));
            })
            .catch(() => {
              setState((s) => ({ ...s, isLoading: false }));

              redirectTo();
            });
        })
        .catch(() => {
          setState((s) => ({ ...s, isLoading: false }));

          core.notifications.toasts.addDanger(
            i18n.translate('xpack.lens.app.docLoadingError', {
              defaultMessage: 'Error loading saved document',
            })
          );

          redirectTo();
        });
    }
  }, [
    core.notifications,
    data.indexPatterns,
    data.query.filterManager,
    docId,
    // TODO: These dependencies are changing too often
    // docStorage,
    // redirectTo,
    // state.persistedDoc,
  ]);

  const runSave = async (
    saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
      returnToOrigin: boolean;
      onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
      newDescription?: string;
    }
  ) => {
    if (!lastKnownDoc) {
      return;
    }
    const [pinnedFilters, appFilters] = _.partition(
      lastKnownDoc.state?.filters,
      esFilters.isFilterPinned
    );
    const lastDocWithoutPinned = pinnedFilters?.length
      ? {
          ...lastKnownDoc,
          state: {
            ...lastKnownDoc.state,
            filters: appFilters,
          },
        }
      : lastKnownDoc;

    const doc = {
      ...lastDocWithoutPinned,
      description: saveProps.newDescription,
      id: saveProps.newCopyOnSave ? undefined : lastKnownDoc.id,
      title: saveProps.newTitle,
    };

    await checkForDuplicateTitle(
      {
        ...doc,
        copyOnSave: saveProps.newCopyOnSave,
        lastSavedTitle: lastKnownDoc?.title,
        getEsType: () => 'lens',
        getDisplayName: () =>
          i18n.translate('xpack.lens.app.saveModalType', {
            defaultMessage: 'Lens visualization',
          }),
      },
      saveProps.isTitleDuplicateConfirmed,
      saveProps.onTitleDuplicate,
      {
        savedObjectsClient: core.savedObjects.client,
        overlays: core.overlays,
      }
    );

    const newlyCreated: boolean = saveProps.newCopyOnSave || !lastKnownDoc?.id;
    docStorage
      .save(doc)
      .then(({ id }) => {
        // Prevents unnecessary network request and disables save button
        const newDoc = { ...doc, id };
        setState((s) => ({
          ...s,
          isSaveModalVisible: false,
          persistedDoc: newDoc,
          lastKnownDoc: newDoc,
        }));
        if (docId !== id || saveProps.returnToOrigin) {
          redirectTo(id, saveProps.returnToOrigin, newlyCreated);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.dir(e);
        trackUiEvent('save_failed');
        core.notifications.toasts.addDanger(
          i18n.translate('xpack.lens.app.docSavingError', {
            defaultMessage: 'Error saving document',
          })
        );
        setState((s) => ({ ...s, isSaveModalVisible: false }));
      });
  };

  const onError = useCallback(
    (e: { message: string }) =>
      core.notifications.toasts.addDanger({
        title: e.message,
      }),
    [core.notifications.toasts]
  );

  const { TopNavMenu } = navigation.ui;

  return (
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'lens',
          data,
          storage,
          ...core,
        }}
      >
        <div className="lnsApp">
          <div className="lnsApp__header">
            <TopNavMenu
              config={[
                ...(!!originatingApp && lastKnownDoc?.id
                  ? [
                      {
                        label: i18n.translate('xpack.lens.app.saveAndReturn', {
                          defaultMessage: 'Save and return',
                        }),
                        emphasize: true,
                        iconType: 'check',
                        run: () => {
                          if (isSaveable && lastKnownDoc) {
                            runSave({
                              newTitle: lastKnownDoc.title,
                              newCopyOnSave: false,
                              isTitleDuplicateConfirmed: false,
                              returnToOrigin: true,
                            });
                          }
                        },
                        testId: 'lnsApp_saveAndReturnButton',
                        disableButton: !isSaveable,
                      },
                    ]
                  : []),
                {
                  label:
                    lastKnownDoc?.id && !!originatingApp
                      ? i18n.translate('xpack.lens.app.saveAs', {
                          defaultMessage: 'Save as',
                        })
                      : i18n.translate('xpack.lens.app.save', {
                          defaultMessage: 'Save',
                        }),
                  emphasize: !originatingApp || !lastKnownDoc?.id,
                  run: () => {
                    if (isSaveable && lastKnownDoc) {
                      setState((s) => ({ ...s, isSaveModalVisible: true }));
                    }
                  },
                  testId: 'lnsApp_saveButton',
                  disableButton: !isSaveable,
                },
              ]}
              data-test-subj="lnsApp_topNav"
              screenTitle={'lens'}
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
              appName={'lens'}
              indexPatterns={state.indexPatternsForTopNav}
              showSearchBar={true}
              showDatePicker={true}
              showQueryBar={true}
              showFilterBar={true}
              showSaveQuery={core.application.capabilities.visualize.saveQuery as boolean}
              savedQuery={state.savedQuery}
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
                  query: {
                    query: '',
                    language:
                      storage.get('kibana.userQueryLanguage') ||
                      core.uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE),
                  },
                }));
              }}
              query={state.query}
              dateRangeFrom={state.dateRange.fromDate}
              dateRangeTo={state.dateRange.toDate}
              indicateNoData={state.indicateNoData}
            />
          </div>

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
                onChange: ({ filterableIndexPatterns, doc }) => {
                  if (!_.isEqual(state.persistedDoc, doc)) {
                    setState((s) => ({ ...s, lastKnownDoc: doc }));
                  }

                  // Update the cached index patterns if the user made a change to any of them
                  if (
                    state.indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
                    filterableIndexPatterns.find(
                      ({ id }) =>
                        !state.indexPatternsForTopNav.find((indexPattern) => indexPattern.id === id)
                    )
                  ) {
                    getAllIndexPatterns(
                      filterableIndexPatterns,
                      data.indexPatterns,
                      core.notifications
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
            originatingApp={originatingApp}
            onSave={(props) => runSave(props)}
            onClose={() => setState((s) => ({ ...s, isSaveModalVisible: false }))}
            documentInfo={{
              id: lastKnownDoc.id,
              title: lastKnownDoc.title || '',
              description: lastKnownDoc.description || '',
            }}
            objectType={i18n.translate('xpack.lens.app.saveModalType', {
              defaultMessage: 'Lens visualization',
            })}
            data-test-subj="lnsApp_saveModalOrigin"
          />
        )}
      </KibanaContextProvider>
    </I18nProvider>
  );
}

export async function getAllIndexPatterns(
  ids: Array<{ id: string }>,
  indexPatternsService: IndexPatternsContract,
  notifications: NotificationsStart
): Promise<IndexPatternInstance[]> {
  try {
    return await Promise.all(ids.map(({ id }) => indexPatternsService.get(id)));
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.indexPatternLoadingError', {
        defaultMessage: 'Error loading index patterns',
      })
    );

    throw new Error(e);
  }
}
