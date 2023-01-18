/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { useStore } from 'react-redux';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { ENABLE_SQL } from '../../common';
import { LensAppServices, LensTopNavActions, LensTopNavMenuProps } from './types';
import { toggleSettingsMenuOpen } from './settings_menu';
import {
  setState,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
  switchAndCleanDatasource,
} from '../state_management';
import {
  getIndexPatternsObjects,
  getIndexPatternsIds,
  getResolvedDateRange,
  refreshIndexPatternsList,
} from '../utils';
import { combineQueryAndFilters, getLayerMetaInfo } from './show_underlying_data';
import { changeIndexPattern } from '../state_management/lens_slice';
import { LensByReferenceInput } from '../embeddable';
import { getShareURL } from './share_action';

function getSaveButtonMeta({
  contextFromEmbeddable,
  showSaveAndReturn,
  showReplaceInDashboard,
  showReplaceInCanvas,
}: {
  contextFromEmbeddable: boolean | undefined;
  showSaveAndReturn: boolean;
  showReplaceInDashboard: boolean;
  showReplaceInCanvas: boolean;
}) {
  if (showSaveAndReturn) {
    return {
      label: contextFromEmbeddable
        ? i18n.translate('xpack.lens.app.saveAndReplace', {
            defaultMessage: 'Save and replace',
          })
        : i18n.translate('xpack.lens.app.saveAndReturn', {
            defaultMessage: 'Save and return',
          }),
      emphasize: true,
      iconType: contextFromEmbeddable ? 'save' : 'checkInCircleFilled',
      testId: 'lnsApp_saveAndReturnButton',
      description: i18n.translate('xpack.lens.app.saveAndReturnButtonAriaLabel', {
        defaultMessage: 'Save the current lens visualization and return to the last app',
      }),
    };
  }

  if (showReplaceInDashboard) {
    return {
      label: i18n.translate('xpack.lens.app.replaceInDashboard', {
        defaultMessage: 'Replace in dashboard',
      }),
      emphasize: true,
      iconType: 'merge',
      testId: 'lnsApp_replaceInDashboardButton',
      description: i18n.translate('xpack.lens.app.replaceInDashboardButtonAriaLabel', {
        defaultMessage:
          'Replace legacy visualization with lens visualization and return to the dashboard',
      }),
    };
  }

  if (showReplaceInCanvas) {
    return {
      label: i18n.translate('xpack.lens.app.replaceInCanvas', {
        defaultMessage: 'Replace in canvas',
      }),
      emphasize: true,
      iconType: 'merge',
      testId: 'lnsApp_replaceInCanvasButton',
      description: i18n.translate('xpack.lens.app.replaceInCanvasButtonAriaLabel', {
        defaultMessage:
          'Replace legacy visualization with lens visualization and return to the canvas',
      }),
    };
  }
}

function getLensTopNavConfig(options: {
  isByValueMode: boolean;
  allowByValue: boolean;
  actions: LensTopNavActions;
  savingToLibraryPermitted: boolean;
  savingToDashboardPermitted: boolean;
  contextOriginatingApp?: string;
  isSaveable: boolean;
  showReplaceInDashboard: boolean;
  showReplaceInCanvas: boolean;
  contextFromEmbeddable?: boolean;
}): TopNavMenuData[] {
  const {
    actions,
    allowByValue,
    savingToLibraryPermitted,
    savingToDashboardPermitted,
    contextOriginatingApp,
    showReplaceInDashboard,
    showReplaceInCanvas,
    contextFromEmbeddable,
    isByValueMode,
  } = options;
  const topNavMenu: TopNavMenuData[] = [];

  const showSaveAndReturn = actions.saveAndReturn.visible;

  const enableSaveButton =
    savingToLibraryPermitted ||
    (allowByValue && savingToDashboardPermitted && !isByValueMode && !showSaveAndReturn);

  const saveButtonLabel = isByValueMode
    ? i18n.translate('xpack.lens.app.addToLibrary', {
        defaultMessage: 'Save to library',
      })
    : actions.saveAndReturn.visible
    ? i18n.translate('xpack.lens.app.saveAs', {
        defaultMessage: 'Save as',
      })
    : i18n.translate('xpack.lens.app.save', {
        defaultMessage: 'Save',
      });

  if (contextOriginatingApp && !actions.cancel.visible) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      run: actions.goBack.execute,
      className: 'lnsNavItem__withDivider',
      testId: 'lnsApp_goBackToAppButton',
      description: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      disableButton: !actions.goBack.enabled,
    });
  }

  if (actions.getUnderlyingDataUrl.visible) {
    const exploreDataInDiscoverLabel = i18n.translate('xpack.lens.app.exploreDataInDiscover', {
      defaultMessage: 'Explore data in Discover',
    });

    topNavMenu.push({
      label: exploreDataInDiscoverLabel,
      run: actions.getUnderlyingDataUrl.execute,
      testId: 'lnsApp_openInDiscover',
      className: 'lnsNavItem__withDivider',
      description: exploreDataInDiscoverLabel,
      disableButton: !actions.getUnderlyingDataUrl.enabled,
      tooltip: actions.getUnderlyingDataUrl.tooltip,
      target: '_blank',
      href: actions.getUnderlyingDataUrl.getLink?.(),
    });
  }

  topNavMenu.push({
    label: i18n.translate('xpack.lens.app.inspect', {
      defaultMessage: 'Inspect',
    }),
    run: actions.inspect.execute,
    testId: 'lnsApp_inspectButton',
    description: i18n.translate('xpack.lens.app.inspectAriaLabel', {
      defaultMessage: 'inspect',
    }),
    disableButton: false,
  });

  if (actions.share.visible) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.shareTitle', {
        defaultMessage: 'Share',
      }),
      run: actions.share.execute,
      testId: 'lnsApp_shareButton',
      description: i18n.translate('xpack.lens.app.shareTitleAria', {
        defaultMessage: 'Share visualization',
      }),
      disableButton: !actions.share.enabled,
      tooltip: actions.share.tooltip,
    });
  }

  topNavMenu.push({
    label: i18n.translate('xpack.lens.app.settings', {
      defaultMessage: 'Settings',
    }),
    run: actions.openSettings.execute,
    className: 'lnsNavItem__withDivider',
    testId: 'lnsApp_settingsButton',
    description: i18n.translate('xpack.lens.app.settingsAriaLabel', {
      defaultMessage: 'Open the Lens settings menu',
    }),
  });

  if (actions.cancel.visible) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.cancel', {
        defaultMessage: 'Cancel',
      }),
      run: actions.cancel.execute,
      testId: 'lnsApp_cancelButton',
      description: i18n.translate('xpack.lens.app.cancelButtonAriaLabel', {
        defaultMessage: 'Return to the last app without saving changes',
      }),
    });
  }

  topNavMenu.push({
    label: saveButtonLabel,
    iconType: (showReplaceInDashboard || showReplaceInCanvas ? false : !showSaveAndReturn)
      ? 'save'
      : undefined,
    emphasize: showReplaceInDashboard || showReplaceInCanvas ? false : !showSaveAndReturn,
    run: actions.showSaveModal.execute,
    testId: 'lnsApp_saveButton',
    description: i18n.translate('xpack.lens.app.saveButtonAriaLabel', {
      defaultMessage: 'Save the current lens visualization',
    }),
    disableButton: !enableSaveButton,
  });

  const saveButtonMeta = getSaveButtonMeta({
    showSaveAndReturn,
    showReplaceInDashboard,
    showReplaceInCanvas,
    contextFromEmbeddable,
  });

  if (saveButtonMeta) {
    topNavMenu.push({
      ...saveButtonMeta,
      run: actions.saveAndReturn.execute,
      disableButton: !actions.saveAndReturn.enabled,
    });
  }

  return topNavMenu;
}

export const LensTopNavMenu = ({
  setHeaderActionMenu,
  initialInput,
  indicateNoData,
  lensInspector,
  setIsSaveModalVisible,
  getIsByValueMode,
  runSave,
  onAppLeave,
  redirectToOrigin,
  datasourceMap,
  visualizationMap,
  title,
  goBackToOriginatingApp,
  contextOriginatingApp,
  initialContextIsEmbedded,
  topNavMenuEntryGenerators,
  initialContext,
  theme$,
  indexPatternService,
  currentDoc,
  onTextBasedSavedAndExit,
  shortUrlService,
  isCurrentStateDirty,
}: LensTopNavMenuProps) => {
  const {
    data,
    navigation,
    uiSettings,
    application,
    attributeService,
    share,
    dashboardFeatureFlag,
    dataViewFieldEditor,
    dataViewEditor,
    dataViews: dataViewsService,
  } = useKibana<LensAppServices>().services;

  const {
    isSaveable,
    isLinkedToOriginatingApp,
    query,
    activeData,
    savedQuery,
    activeDatasourceId,
    datasourceStates,
    visualization,
    filters,
    dataViews,
  } = useLensSelector((state) => state.lens);

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = React.useCallback(
    (state: Partial<LensAppState>) => dispatch(setState(state)),
    [dispatch]
  );
  const [indexPatterns, setIndexPatterns] = useState<DataView[]>([]);
  const [currentIndexPattern, setCurrentIndexPattern] = useState<DataView>();
  const [isOnTextBasedMode, setIsOnTextBasedMode] = useState(false);
  const [rejectedIndexPatterns, setRejectedIndexPatterns] = useState<string[]>([]);

  const dispatchChangeIndexPattern = React.useCallback(
    async (dataViewOrId: DataView | string) => {
      const indexPatternId = typeof dataViewOrId === 'string' ? dataViewOrId : dataViewOrId.id!;
      const newIndexPatterns = await indexPatternService.ensureIndexPattern({
        id: indexPatternId,
        cache: dataViews.indexPatterns,
      });
      dispatch(
        changeIndexPattern({
          dataViews: { indexPatterns: newIndexPatterns },
          datasourceIds: Object.keys(datasourceStates),
          visualizationIds: visualization.activeId ? [visualization.activeId] : [],
          indexPatternId,
        })
      );
    },
    [
      dataViews.indexPatterns,
      datasourceStates,
      dispatch,
      indexPatternService,
      visualization.activeId,
    ]
  );

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !currentIndexPattern?.isPersisted();
  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  const allLoaded = Object.values(datasourceStates).every(({ isLoading }) => isLoading === false);

  useEffect(() => {
    const activeDatasource =
      datasourceMap && activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
        ? datasourceMap[activeDatasourceId]
        : undefined;
    if (!activeDatasource) {
      return;
    }
    const indexPatternIds = new Set(
      getIndexPatternsIds({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        datasourceStates,
        visualizationState: visualization.state,
        activeVisualization: visualization.activeId
          ? visualizationMap[visualization.activeId]
          : undefined,
      })
    );
    // Add ad-hoc data views from the Lens state even if they are not used
    Object.values(dataViews.indexPatterns)
      .filter((indexPattern) => !indexPattern.isPersisted)
      .forEach((indexPattern) => {
        indexPatternIds.add(indexPattern.id);
      });

    const hasIndexPatternsChanged =
      indexPatterns.length + rejectedIndexPatterns.length !== indexPatternIds.size ||
      [...indexPatternIds].some(
        (id) =>
          ![...indexPatterns.map((ip) => ip.id), ...rejectedIndexPatterns].find(
            (loadedId) => loadedId === id
          )
      );

    // Update the cached index patterns if the user made a change to any of them
    if (hasIndexPatternsChanged) {
      getIndexPatternsObjects([...indexPatternIds], dataViewsService).then(
        ({ indexPatterns: indexPatternObjects, rejectedIds }) => {
          setIndexPatterns(indexPatternObjects);
          setRejectedIndexPatterns(rejectedIds);
        }
      );
    }
  }, [
    datasourceStates,
    activeDatasourceId,
    rejectedIndexPatterns,
    datasourceMap,
    visualizationMap,
    visualization,
    indexPatterns,
    dataViewsService,
    dataViews,
  ]);

  useEffect(() => {
    const setCurrentPattern = async () => {
      if (activeDatasourceId && datasourceStates[activeDatasourceId].state) {
        const dataViewId = datasourceMap[activeDatasourceId].getUsedDataView(
          datasourceStates[activeDatasourceId].state
        );
        const dataView = dataViewId ? await data.dataViews.get(dataViewId) : undefined;
        setCurrentIndexPattern(dataView ?? indexPatterns[0]);
      }
    };

    setCurrentPattern();
  }, [
    activeDatasourceId,
    datasourceMap,
    datasourceStates,
    indexPatterns,
    data.dataViews,
    isOnTextBasedMode,
  ]);

  useEffect(() => {
    if (typeof query === 'object' && query !== null && isOfAggregateQueryType(query)) {
      setIsOnTextBasedMode(true);
    }
  }, [query]);

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      closeFieldEditor.current?.();
      closeDataViewEditor.current?.();
    };
  }, []);

  const { AggregateQueryTopNavMenu } = navigation.ui;
  const { from, to } = data.query.timefilter.timefilter.getTime();

  const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);
  const savingToDashboardPermitted = Boolean(
    isSaveable && application.capabilities.dashboard?.showWriteControls
  );

  const unsavedTitle = i18n.translate('xpack.lens.app.unsavedFilename', {
    defaultMessage: 'unsaved',
  });
  const additionalMenuEntries = useMemo(() => {
    if (!visualization.activeId) return undefined;
    const visualizationId = visualization.activeId;
    const entries = topNavMenuEntryGenerators.flatMap((menuEntryGenerator) => {
      const menuEntry = menuEntryGenerator({
        datasourceStates,
        visualizationId,
        visualizationState: visualization.state,
        query,
        filters,
        initialContext,
        currentDoc,
      });
      return menuEntry ? [menuEntry] : [];
    });
    if (entries.length > 0) {
      return entries;
    }
  }, [
    datasourceStates,
    topNavMenuEntryGenerators,
    visualization.activeId,
    visualization.state,
    query,
    filters,
    initialContext,
    currentDoc,
  ]);

  const discoverLocator = share?.url.locators.get('DISCOVER_APP_LOCATOR');

  const layerMetaInfo = useMemo(() => {
    if (!activeDatasourceId || !discoverLocator) {
      return;
    }
    if (visualization.activeId == null) {
      return;
    }
    return getLayerMetaInfo(
      datasourceMap[activeDatasourceId],
      datasourceStates[activeDatasourceId].state,
      visualizationMap[visualization.activeId],
      visualization.state,
      activeData,
      dataViews.indexPatterns,
      data.query.timefilter.timefilter.getTime(),
      application.capabilities
    );
  }, [
    activeDatasourceId,
    discoverLocator,
    visualization,
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeData,
    dataViews.indexPatterns,
    data.query.timefilter.timefilter,
    application.capabilities,
  ]);

  const lensStore = useStore();

  const adHocDataViews = indexPatterns.filter((pattern) => !pattern.isPersisted());

  const topNavConfig = useMemo(() => {
    const showReplaceInDashboard =
      initialContext?.originatingApp === 'dashboards' &&
      !(initialInput as LensByReferenceInput)?.savedObjectId;
    const showReplaceInCanvas =
      initialContext?.originatingApp === 'canvas' &&
      !(initialInput as LensByReferenceInput)?.savedObjectId;
    const contextFromEmbeddable =
      initialContext && 'isEmbeddable' in initialContext && initialContext.isEmbeddable;
    const showSaveAndReturn =
      !(showReplaceInDashboard || showReplaceInCanvas) &&
      (Boolean(
        isLinkedToOriginatingApp &&
          // Temporarily required until the 'by value' paradigm is default.
          (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
      ) ||
        Boolean(initialContextIsEmbedded));

    const hasData = Boolean(activeData && Object.keys(activeData).length);
    const csvEnabled = Boolean(isSaveable && hasData);
    const shareUrlEnabled = Boolean(application.capabilities.visualize.createShortUrl && hasData);

    const showShareMenu = csvEnabled || shareUrlEnabled;
    const baseMenuEntries = getLensTopNavConfig({
      isByValueMode: getIsByValueMode(),
      allowByValue: dashboardFeatureFlag.allowByValueEmbeddables,
      savingToLibraryPermitted,
      savingToDashboardPermitted,
      isSaveable,
      contextOriginatingApp,
      showReplaceInDashboard,
      showReplaceInCanvas,
      contextFromEmbeddable,
      actions: {
        inspect: { visible: true, execute: () => lensInspector.inspect({ title }) },
        share: {
          visible: true,
          enabled: showShareMenu,
          tooltip: () => {
            if (!showShareMenu) {
              return i18n.translate('xpack.lens.app.shareButtonDisabledWarning', {
                defaultMessage: 'The visualization has no data to share.',
              });
            }
          },
          execute: async (anchorElement) => {
            if (!share) {
              return;
            }
            const sharingData = {
              activeData,
              csvEnabled,
              title: title || unsavedTitle,
            };

            const { shareableUrl, savedObjectURL } = await getShareURL(
              shortUrlService,
              { application, data },
              {
                filters,
                query,
                activeDatasourceId,
                datasourceStates,
                datasourceMap,
                visualizationMap,
                visualization,
                currentDoc,
                adHocDataViews: adHocDataViews.map((dataView) => dataView.toSpec()),
              }
            );

            share.toggleShareContextMenu({
              anchorElement,
              allowEmbed: false,
              allowShortUrl: false, // we'll manage this implicitly via the new service
              shareableUrl: shareableUrl || '',
              shareableUrlForSavedObject: savedObjectURL.href,
              objectId: currentDoc?.savedObjectId,
              objectType: 'lens_visualization',
              objectTypeTitle: i18n.translate('xpack.lens.app.share.panelTitle', {
                defaultMessage: 'visualization',
              }),
              sharingData,
              isDirty: isCurrentStateDirty,
              // disable the menu if both shortURL permission and the visualization has not been saved
              // TODO: improve here the disabling state with more specific checks
              disabledShareUrl: Boolean(!shareUrlEnabled && !currentDoc?.savedObjectId),
              showPublicUrlSwitch: () => false,
              onClose: () => {
                anchorElement?.focus();
              },
            });
          },
        },
        saveAndReturn: {
          visible: showSaveAndReturn,
          enabled: isSaveable,
          execute: () => {
            if (isSaveable) {
              // disabling the validation on app leave because the document has been saved.
              onAppLeave((actions) => {
                return actions.default();
              });
              runSave(
                {
                  newTitle:
                    title ||
                    (initialContext &&
                    'isEmbeddable' in initialContext &&
                    initialContext.isEmbeddable
                      ? i18n.translate('xpack.lens.app.convertedLabel', {
                          defaultMessage: '{title} (converted)',
                          values: {
                            title:
                              initialContext.title ||
                              `${initialContext.visTypeTitle} visualization`,
                          },
                        })
                      : ''),
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
        },
        showSaveModal: {
          visible: Boolean(savingToDashboardPermitted || savingToLibraryPermitted),
          execute: () => {
            if (savingToDashboardPermitted || savingToLibraryPermitted) {
              setIsSaveModalVisible(true);
            }
          },
        },
        goBack: {
          visible: Boolean(contextOriginatingApp),
          enabled: Boolean(contextOriginatingApp),
          execute: () => {
            if (contextOriginatingApp) {
              goBackToOriginatingApp?.();
            }
          },
        },
        cancel: {
          visible: Boolean(isLinkedToOriginatingApp),
          execute: () => {
            if (redirectToOrigin) {
              redirectToOrigin();
            }
          },
        },
        getUnderlyingDataUrl: {
          visible: Boolean(layerMetaInfo?.isVisible),
          enabled: !layerMetaInfo?.error,
          tooltip: () => {
            return layerMetaInfo?.error;
          },
          execute: () => {},
          getLink: () => {
            if (!layerMetaInfo) {
              return;
            }
            const { error, meta } = layerMetaInfo;
            // If Discover is not available, return
            // If there's no data, return
            if (error || !discoverLocator || !meta) {
              return;
            }
            const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
              query,
              filters,
              meta,
              indexPatterns,
              getEsQueryConfig(uiSettings)
            );

            return discoverLocator.getRedirectUrl({
              dataViewSpec: dataViews.indexPatterns[meta.id]?.spec,
              timeRange: data.query.timefilter.timefilter.getTime(),
              filters: newFilters,
              query: isOnTextBasedMode ? query : newQuery,
              columns: meta.columns,
            });
          },
        },
        openSettings: {
          visible: true,
          execute: (anchorElement) =>
            toggleSettingsMenuOpen({
              lensStore,
              anchorElement,
              theme$,
            }),
        },
      },
    });
    return [...(additionalMenuEntries || []), ...baseMenuEntries];
  }, [
    initialContext,
    initialInput,
    isLinkedToOriginatingApp,
    dashboardFeatureFlag.allowByValueEmbeddables,
    initialContextIsEmbedded,
    activeData,
    isSaveable,
    shortUrlService,
    application,
    getIsByValueMode,
    savingToLibraryPermitted,
    savingToDashboardPermitted,
    contextOriginatingApp,
    layerMetaInfo,
    additionalMenuEntries,
    lensInspector,
    title,
    share,
    unsavedTitle,
    data,
    filters,
    query,
    activeDatasourceId,
    datasourceStates,
    datasourceMap,
    visualizationMap,
    visualization,
    currentDoc,
    isCurrentStateDirty,
    onAppLeave,
    runSave,
    attributeService,
    setIsSaveModalVisible,
    goBackToOriginatingApp,
    redirectToOrigin,
    discoverLocator,
    indexPatterns,
    uiSettings,
    dataViews.indexPatterns,
    isOnTextBasedMode,
    lensStore,
    theme$,
    adHocDataViews,
  ]);

  const onQuerySubmitWrapped = useCallback(
    (payload) => {
      const { dateRange, query: newQuery } = payload;
      const currentRange = data.query.timefilter.timefilter.getTime();
      if (dateRange.from !== currentRange.from || dateRange.to !== currentRange.to) {
        data.query.timefilter.timefilter.setTime(dateRange);
      } else {
        // Query has changed, renew the session id.
        // recalculate resolvedDateRange (relevant for relative time range)
        dispatchSetState({
          searchSessionId: data.search.session.start(),
          resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
        });
      }
      if (newQuery) {
        if (!isEqual(newQuery, query)) {
          dispatchSetState({ query: newQuery });
          // check if query is text-based (sql, essql etc) and switchAndCleanDatasource
          if (isOfAggregateQueryType(newQuery) && !isOnTextBasedMode) {
            setIsOnTextBasedMode(true);
            dispatch(
              switchAndCleanDatasource({
                newDatasourceId: 'textBased',
                visualizationId: visualization?.activeId,
                currentIndexPatternId: currentIndexPattern?.id,
              })
            );
          }
        }
      }
    },
    [
      currentIndexPattern?.id,
      data.query.timefilter.timefilter,
      data.search.session,
      dispatch,
      dispatchSetState,
      isOnTextBasedMode,
      query,
      visualization?.activeId,
    ]
  );

  const onSavedWrapped = useCallback(
    (newSavedQuery) => {
      dispatchSetState({ savedQuery: newSavedQuery });
    },
    [dispatchSetState]
  );

  const onSavedQueryUpdatedWrapped = useCallback(
    (newSavedQuery) => {
      const savedQueryFilters = newSavedQuery.attributes.filters || [];
      const globalFilters = data.query.filterManager.getGlobalFilters();
      data.query.filterManager.setFilters([...globalFilters, ...savedQueryFilters]);
      dispatchSetState({
        query: newSavedQuery.attributes.query,
        savedQuery: { ...newSavedQuery },
      }); // Shallow query for reference issues
    },
    [data.query.filterManager, dispatchSetState]
  );

  const onClearSavedQueryWrapped = useCallback(() => {
    data.query.filterManager.setFilters(data.query.filterManager.getGlobalFilters());
    dispatchSetState({
      filters: data.query.filterManager.getGlobalFilters(),
      query: data.query.queryString.getDefaultQuery(),
      savedQuery: undefined,
    });
  }, [data.query.filterManager, data.query.queryString, dispatchSetState]);

  const refreshFieldList = useCallback(async () => {
    if (currentIndexPattern?.id) {
      refreshIndexPatternsList({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        indexPatternId: currentIndexPattern.id,
        indexPatternService,
        indexPatternsCache: dataViews.indexPatterns,
      });
    }
    // start a new session so all charts are refreshed
    data.search.session.start();
  }, [
    currentIndexPattern,
    data.search.session,
    datasourceMap,
    datasourceStates,
    indexPatternService,
    dataViews.indexPatterns,
  ]);

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (currentIndexPattern?.id) {
              const indexPatternInstance = await data.dataViews.get(currentIndexPattern?.id);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: indexPatternInstance,
                },
                fieldName,
                onSave: () => {
                  if (indexPatternInstance.isPersisted()) {
                    refreshFieldList();
                  } else {
                    indexPatternService.replaceDataViewId(indexPatternInstance);
                  }
                },
              });
            }
          }
        : undefined,
    [
      canEditDataView,
      currentIndexPattern?.id,
      data.dataViews,
      dataViewFieldEditor,
      indexPatternService,
      refreshFieldList,
    ]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          if (isOnTextBasedMode) {
            dispatch(
              switchAndCleanDatasource({
                newDatasourceId: 'formBased',
                visualizationId: visualization?.activeId,
                currentIndexPatternId: dataView?.id,
              })
            );
          }
          dispatchChangeIndexPattern(dataView);
          setCurrentIndexPattern(dataView);
        }
      },
      allowAdHocDataView: true,
    });
  }, [
    dataViewEditor,
    dispatch,
    dispatchChangeIndexPattern,
    isOnTextBasedMode,
    visualization?.activeId,
  ]);

  const onCreateDefaultAdHocDataView = useCallback(
    async (pattern: string) => {
      const dataView = await dataViewsService.create({
        title: pattern,
      });
      if (dataView.fields.getByName('@timestamp')?.type === 'date') {
        dataView.timeFieldName = '@timestamp';
      }
      if (isOnTextBasedMode) {
        dispatch(
          switchAndCleanDatasource({
            newDatasourceId: 'formBased',
            visualizationId: visualization?.activeId,
            currentIndexPatternId: dataView?.id,
          })
        );
      }
      dispatchChangeIndexPattern(dataView);
      setCurrentIndexPattern(dataView);
    },
    [
      dataViewsService,
      dispatch,
      dispatchChangeIndexPattern,
      isOnTextBasedMode,
      visualization?.activeId,
    ]
  );

  // setting that enables/disables SQL
  const isSQLModeEnabled = uiSettings.get(ENABLE_SQL);
  const supportedTextBasedLanguages = [];
  if (isSQLModeEnabled) {
    supportedTextBasedLanguages.push('SQL');
  }

  const dataViewPickerProps: DataViewPickerProps = {
    trigger: {
      label: currentIndexPattern?.getName?.() || '',
      'data-test-subj': 'lns-dataView-switch-link',
      title: currentIndexPattern?.title || '',
    },
    currentDataViewId: currentIndexPattern?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onCreateDefaultAdHocDataView,
    adHocDataViews,
    onChangeDataView: async (newIndexPatternId: string) => {
      const currentDataView = await data.dataViews.get(newIndexPatternId);
      setCurrentIndexPattern(currentDataView);
      dispatchChangeIndexPattern(newIndexPatternId);
      if (isOnTextBasedMode) {
        dispatch(
          switchAndCleanDatasource({
            newDatasourceId: 'formBased',
            visualizationId: visualization?.activeId,
            currentIndexPatternId: newIndexPatternId,
          })
        );
        setIsOnTextBasedMode(false);
      }
    },
    onEditDataView: async (updatedDataViewStub) => {
      if (!currentIndexPattern) return;
      if (currentIndexPattern.isPersisted()) {
        // clear instance cache and fetch again to make sure fields are up to date (in case pattern changed)
        dataViewsService.clearInstanceCache(currentIndexPattern.id);
        const updatedCurrentIndexPattern = await dataViewsService.get(currentIndexPattern.id!);
        // if the data view was persisted, reload it from cache
        const updatedCache = {
          ...dataViews.indexPatterns,
        };
        delete updatedCache[currentIndexPattern.id!];
        const newIndexPatterns = await indexPatternService.ensureIndexPattern({
          id: updatedCurrentIndexPattern.id!,
          cache: updatedCache,
        });
        dispatch(
          changeIndexPattern({
            dataViews: { indexPatterns: newIndexPatterns },
            indexPatternId: updatedCurrentIndexPattern.id!,
          })
        );
        // Renew session id to make sure the request is done again
        dispatchSetState({
          searchSessionId: data.search.session.start(),
          resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
        });
        // update list of index patterns to pick up mutations in the changed data view
        setCurrentIndexPattern(updatedCurrentIndexPattern);
      } else {
        // if it was an ad-hoc data view, we need to switch to a new data view anyway
        indexPatternService.replaceDataViewId(updatedDataViewStub);
      }
    },
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
  };

  // text based languages errors should also appear to the unified search bar
  const textBasedLanguageModeErrors: Error[] = [];
  if (activeDatasourceId && allLoaded) {
    if (
      datasourceMap[activeDatasourceId] &&
      datasourceMap[activeDatasourceId].getUnifiedSearchErrors
    ) {
      const errors = datasourceMap[activeDatasourceId].getUnifiedSearchErrors?.(
        datasourceStates[activeDatasourceId].state
      );
      if (errors) {
        textBasedLanguageModeErrors.push(...errors);
      }
    }
  }

  return (
    <AggregateQueryTopNavMenu
      setMenuMountPoint={setHeaderActionMenu}
      config={topNavConfig}
      showSaveQuery={Boolean(application.capabilities.visualize.saveQuery)}
      savedQuery={savedQuery}
      onQuerySubmit={onQuerySubmitWrapped}
      onSaved={onSavedWrapped}
      onSavedQueryUpdated={onSavedQueryUpdatedWrapped}
      onClearSavedQuery={onClearSavedQueryWrapped}
      indexPatterns={indexPatterns}
      query={query}
      dateRangeFrom={from}
      dateRangeTo={to}
      indicateNoData={indicateNoData}
      showSearchBar={true}
      dataViewPickerComponentProps={dataViewPickerProps}
      showDatePicker={
        indexPatterns.some((ip) => ip.isTimeBased()) ||
        Boolean(
          allLoaded &&
            activeDatasourceId &&
            datasourceMap[activeDatasourceId].isTimeBased(
              datasourceStates[activeDatasourceId].state,
              dataViews.indexPatterns
            )
        )
      }
      textBasedLanguageModeErrors={textBasedLanguageModeErrors}
      onTextBasedSavedAndExit={onTextBasedSavedAndExit}
      showFilterBar={true}
      data-test-subj="lnsApp_topNav"
      screenTitle={'lens'}
      appName={'lens'}
      displayStyle="detached"
    />
  );
};
