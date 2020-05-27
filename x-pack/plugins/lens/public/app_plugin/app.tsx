/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Query, DataPublicPluginStart } from 'src/plugins/data/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { AppMountContext, NotificationsStart } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
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
} from '../../../../../src/plugins/data/public';

interface State {
  isLoading: boolean;
  isSaveModalVisible: boolean;
  indexPatternsForTopNav: IndexPatternInstance[];
  originatingApp: string | undefined;
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
  originatingAppFromUrl,
  navigation,
}: {
  editorFrame: EditorFrameInstance;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  core: AppMountContext['core'];
  storage: IStorageWrapper;
  docId?: string;
  docStorage: SavedObjectStore;
  redirectTo: (
    id?: string,
    returnToOrigin?: boolean,
    originatingApp?: string | undefined,
    newlyCreated?: boolean
  ) => void;
  originatingAppFromUrl?: string | undefined;
}) {
  const language =
    storage.get('kibana.userQueryLanguage') || core.uiSettings.get('search:queryLanguage');

  const [state, setState] = useState<State>(() => {
    const currentRange = data.query.timefilter.timefilter.getTime();
    return {
      isLoading: !!docId,
      isSaveModalVisible: false,
      indexPatternsForTopNav: [],
      query: { query: '', language },
      originatingApp: originatingAppFromUrl,
      dateRange: {
        fromDate: currentRange.from,
        toDate: currentRange.to,
      },
      filters: [],
    };
  });

  const { lastKnownDoc } = state;

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

    return () => {
      filterSubscription.unsubscribe();
      timeSubscription.unsubscribe();
    };
  }, []);

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
  }, [state.persistedDoc && state.persistedDoc.title]);

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
  }, [docId]);

  const isSaveable =
    lastKnownDoc &&
    lastKnownDoc.expression &&
    lastKnownDoc.expression.length > 0 &&
    core.application.capabilities.visualize.save;

  const runSave = (
    saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
      returnToOrigin: boolean;
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
      id: saveProps.newCopyOnSave ? undefined : lastKnownDoc.id,
      title: saveProps.newTitle,
    };

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
          redirectTo(id, saveProps.returnToOrigin, state.originatingApp, newlyCreated);
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
    []
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
                ...(!!state.originatingApp && lastKnownDoc?.id
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
                    lastKnownDoc?.id && !!state.originatingApp
                      ? i18n.translate('xpack.lens.app.saveAs', {
                          defaultMessage: 'Save as',
                        })
                      : i18n.translate('xpack.lens.app.save', {
                          defaultMessage: 'Save',
                        }),
                  emphasize: !state.originatingApp || !lastKnownDoc?.id,
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
                      core.uiSettings.get('search:queryLanguage'),
                  },
                }));
              }}
              query={state.query}
              dateRangeFrom={state.dateRange.fromDate}
              dateRangeTo={state.dateRange.toDate}
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
            originatingApp={state.originatingApp}
            onSave={(props) => runSave(props)}
            onClose={() => setState((s) => ({ ...s, isSaveModalVisible: false }))}
            documentInfo={{
              id: lastKnownDoc.id,
              title: lastKnownDoc.title || '',
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
