/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './app.scss';

import _ from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { EuiBreadcrumb } from '@elastic/eui';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  OnSaveProps,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { injectFilterReferences } from '../persistence';
import { NativeRenderer } from '../native_renderer';
import { trackUiEvent } from '../lens_ui_telemetry';
import {
  esFilters,
  IndexPattern as IndexPatternInstance,
  IndexPatternsContract,
  syncQueryStateWithUrl,
} from '../../../../../src/plugins/data/public';
import { LENS_EMBEDDABLE_TYPE, getFullPath } from '../../common';
import { LensAppProps, LensAppServices, LensAppState } from './types';
import { getLensTopNavConfig } from './lens_top_nav';
import { TagEnhancedSavedObjectSaveModalOrigin } from './tags_saved_object_save_modal_origin_wrapper';
import {
  LensByReferenceInput,
  LensEmbeddableInput,
} from '../editor_frame_service/embeddable/embeddable';

export function App({
  history,
  onAppLeave,
  redirectTo,
  editorFrame,
  initialInput,
  incomingState,
  redirectToOrigin,
  setHeaderActionMenu,
  initialContext,
}: LensAppProps) {
  const {
    data,
    chrome,
    overlays,
    navigation,
    uiSettings,
    application,
    notifications,
    attributeService,
    savedObjectsClient,
    savedObjectsTagging,
    getOriginatingAppName,

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = useKibana<LensAppServices>().services;

  const [state, setState] = useState<LensAppState>(() => {
    const currentRange = data.query.timefilter.timefilter.getTime();
    return {
      query: data.query.queryString.getQuery(),
      // Do not use app-specific filters from previous app,
      // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
      filters: !initialContext
        ? data.query.filterManager.getGlobalFilters()
        : data.query.filterManager.getFilters(),
      isLoading: Boolean(initialInput),
      indexPatternsForTopNav: [],
      dateRange: {
        fromDate: currentRange.from,
        toDate: currentRange.to,
      },
      isLinkedToOriginatingApp: Boolean(incomingState?.originatingApp),
      isSaveModalVisible: false,
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

  const getIsByValueMode = useCallback(
    () =>
      Boolean(
        // Temporarily required until the 'by value' paradigm is default.
        dashboardFeatureFlag.allowByValueEmbeddables &&
          state.isLinkedToOriginatingApp &&
          !(initialInput as LensByReferenceInput)?.savedObjectId
      ),
    [dashboardFeatureFlag.allowByValueEmbeddables, state.isLinkedToOriginatingApp, initialInput]
  );

  useEffect(() => {
    // Clear app-specific filters when navigating to Lens. Necessary because Lens
    // can be loaded without a full page refresh. If the user navigates to Lens from Discover
    // we keep the filters
    if (!initialContext) {
      data.query.filterManager.setAppFilters([]);
    }

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
    initialContext,
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
    onAppLeave,
    lastKnownDoc,
    state.isSaveable,
    state.persistedDoc,
    getLastKnownDocWithoutPinnedFilters,
    application.capabilities.visualize.save,
  ]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    const isByValueMode = getIsByValueMode();
    const breadcrumbs: EuiBreadcrumb[] = [];
    if (state.isLinkedToOriginatingApp && getOriginatingAppName() && redirectToOrigin) {
      breadcrumbs.push({
        onClick: () => {
          redirectToOrigin();
        },
        text: getOriginatingAppName(),
      });
    }
    if (!isByValueMode) {
      breadcrumbs.push({
        href: application.getUrlForApp('visualize'),
        onClick: (e) => {
          application.navigateToApp('visualize', { path: '/' });
          e.preventDefault();
        },
        text: i18n.translate('xpack.lens.breadcrumbsTitle', {
          defaultMessage: 'Visualize',
        }),
      });
    }
    let currentDocTitle = i18n.translate('xpack.lens.breadcrumbsCreate', {
      defaultMessage: 'Create',
    });
    if (state.persistedDoc) {
      currentDocTitle = isByValueMode
        ? i18n.translate('xpack.lens.breadcrumbsByValue', { defaultMessage: 'Edit visualization' })
        : state.persistedDoc.title;
    }
    breadcrumbs.push({ text: currentDocTitle });
    chrome.setBreadcrumbs(breadcrumbs);
  }, [
    dashboardFeatureFlag.allowByValueEmbeddables,
    state.isLinkedToOriginatingApp,
    getOriginatingAppName,
    state.persistedDoc,
    redirectToOrigin,
    getIsByValueMode,
    initialInput,
    application,
    chrome,
  ]);

  useEffect(() => {
    if (
      !initialInput ||
      (attributeService.inputIsRefType(initialInput) &&
        initialInput.savedObjectId === state.persistedDoc?.savedObjectId)
    ) {
      return;
    }

    setState((s) => ({ ...s, isLoading: true }));
    attributeService
      .unwrapAttributes(initialInput)
      .then((attributes) => {
        if (!initialInput) {
          return;
        }
        const doc = {
          ...initialInput,
          ...attributes,
          type: LENS_EMBEDDABLE_TYPE,
        };

        if (attributeService.inputIsRefType(initialInput)) {
          chrome.recentlyAccessed.add(
            getFullPath(initialInput.savedObjectId),
            attributes.title,
            initialInput.savedObjectId
          );
        }
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
      })
      .catch((e) => {
        setState((s) => ({ ...s, isLoading: false }));
        notifications.toasts.addDanger(
          i18n.translate('xpack.lens.app.docLoadingError', {
            defaultMessage: 'Error loading saved document',
          })
        );

        redirectTo();
      });
  }, [
    notifications,
    data.indexPatterns,
    data.query.filterManager,
    initialInput,
    attributeService,
    redirectTo,
    chrome.recentlyAccessed,
    state.persistedDoc?.savedObjectId,
    state.persistedDoc?.state,
  ]);

  const runSave = async (
    saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
      returnToOrigin: boolean;
      onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
      newDescription?: string;
      newTags?: string[];
    },
    options: { saveToLibrary: boolean }
  ) => {
    if (!lastKnownDoc) {
      return;
    }

    let references = lastKnownDoc.references;
    if (savedObjectsTagging && saveProps.newTags) {
      references = savedObjectsTagging.ui.updateTagsReferences(references, saveProps.newTags);
    }

    const docToSave = {
      ...getLastKnownDocWithoutPinnedFilters()!,
      description: saveProps.newDescription,
      title: saveProps.newTitle,
      references,
    };

    // Required to serialize filters in by value mode until
    // https://github.com/elastic/kibana/issues/77588 is fixed
    if (getIsByValueMode()) {
      docToSave.state.filters.forEach((filter) => {
        if (typeof filter.meta.value === 'function') {
          delete filter.meta.value;
        }
      });
    }

    const originalInput = saveProps.newCopyOnSave ? undefined : initialInput;
    const originalSavedObjectId = (originalInput as LensByReferenceInput)?.savedObjectId;
    if (options.saveToLibrary) {
      try {
        await checkForDuplicateTitle(
          {
            id: originalSavedObjectId,
            title: docToSave.title,
            copyOnSave: saveProps.newCopyOnSave,
            lastSavedTitle: lastKnownDoc.title,
            getEsType: () => 'lens',
            getDisplayName: () =>
              i18n.translate('xpack.lens.app.saveModalType', {
                defaultMessage: 'Lens visualization',
              }),
          },
          saveProps.isTitleDuplicateConfirmed,
          saveProps.onTitleDuplicate,
          {
            savedObjectsClient,
            overlays,
          }
        );
      } catch (e) {
        // ignore duplicate title failure, user notified in save modal
        return;
      }
    }
    try {
      const newInput = (await attributeService.wrapAttributes(
        docToSave,
        options.saveToLibrary,
        originalInput
      )) as LensEmbeddableInput;

      if (saveProps.returnToOrigin && redirectToOrigin) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave((actions) => {
          return actions.default();
        });
        redirectToOrigin({ input: newInput, isCopied: saveProps.newCopyOnSave });
        return;
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.lens.app.saveVisualization.successNotificationText', {
          defaultMessage: `Saved '{visTitle}'`,
          values: {
            visTitle: docToSave.title,
          },
        })
      );

      if (
        attributeService.inputIsRefType(newInput) &&
        newInput.savedObjectId !== originalSavedObjectId
      ) {
        chrome.recentlyAccessed.add(
          getFullPath(newInput.savedObjectId),
          docToSave.title,
          newInput.savedObjectId
        );
        setState((s) => ({
          ...s,
          isSaveModalVisible: false,
          isLinkedToOriginatingApp: false,
        }));
        redirectTo(newInput.savedObjectId);
        return;
      }

      const newDoc = {
        ...docToSave,
        ...newInput,
      };
      setState((s) => ({
        ...s,
        persistedDoc: newDoc,
        lastKnownDoc: newDoc,
        isSaveModalVisible: false,
        isLinkedToOriginatingApp: false,
      }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.dir(e);
      trackUiEvent('save_failed');
      setState((s) => ({ ...s, isSaveModalVisible: false }));
    }
  };

  const { TopNavMenu } = navigation.ui;

  const savingPermitted = Boolean(state.isSaveable && application.capabilities.visualize.save);
  const topNavConfig = getLensTopNavConfig({
    showSaveAndReturn: Boolean(
      state.isLinkedToOriginatingApp &&
        // Temporarily required until the 'by value' paradigm is default.
        (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
    ),
    isByValueMode: getIsByValueMode(),
    showCancel: Boolean(state.isLinkedToOriginatingApp),
    savingPermitted,
    actions: {
      saveAndReturn: () => {
        if (savingPermitted && lastKnownDoc) {
          // disabling the validation on app leave because the document has been saved.
          onAppLeave((actions) => {
            return actions.default();
          });
          runSave(
            {
              newTitle: lastKnownDoc.title,
              newCopyOnSave: false,
              isTitleDuplicateConfirmed: false,
              returnToOrigin: true,
            },
            {
              saveToLibrary:
                (initialInput && attributeService.inputIsRefType(initialInput)) ?? false,
            }
          );
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

  const tagsIds =
    state.persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(state.persistedDoc.references)
      : [];

  return (
    <>
      <div className="lnsApp">
        <div className="lnsApp__header">
          <TopNavMenu
            setMenuMountPoint={setHeaderActionMenu}
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
              initialContext,
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
        <TagEnhancedSavedObjectSaveModalOrigin
          savedObjectsTagging={savedObjectsTagging}
          initialTags={tagsIds}
          originatingApp={incomingState?.originatingApp}
          onSave={(props) => runSave(props, { saveToLibrary: true })}
          onClose={() => {
            setState((s) => ({ ...s, isSaveModalVisible: false }));
          }}
          getAppNameFromId={() => getOriginatingAppName()}
          documentInfo={{
            id: lastKnownDoc.savedObjectId,
            title: lastKnownDoc.title || '',
            description: lastKnownDoc.description || '',
          }}
          returnToOriginSwitchLabel={
            getIsByValueMode() && initialInput
              ? i18n.translate('xpack.lens.app.updatePanel', {
                  defaultMessage: 'Update panel on {originatingAppName}',
                  values: { originatingAppName: getOriginatingAppName() },
                })
              : undefined
          }
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
