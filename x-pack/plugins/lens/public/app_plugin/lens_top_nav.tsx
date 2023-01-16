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
import { downloadMultipleAs } from '@kbn/share-plugin/public';
import { tableHasFormulas } from '@kbn/data-plugin/common';
import { exporters, getEsQueryConfig } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { ENABLE_SQL } from '../../common';
import {
  LensAppServices,
  LensTopNavActions,
  LensTopNavMenuProps,
  LensTopNavTooltips,
} from './types';
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

function getLensTopNavConfig(options: {
  showSaveAndReturn: boolean;
  enableExportToCSV: boolean;
  showOpenInDiscover?: boolean;
  showCancel: boolean;
  isByValueMode: boolean;
  allowByValue: boolean;
  actions: LensTopNavActions;
  tooltips: LensTopNavTooltips;
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
    showCancel,
    allowByValue,
    enableExportToCSV,
    showOpenInDiscover,
    showSaveAndReturn,
    savingToLibraryPermitted,
    savingToDashboardPermitted,
    tooltips,
    contextOriginatingApp,
    isSaveable,
    showReplaceInDashboard,
    showReplaceInCanvas,
    contextFromEmbeddable,
  } = options;
  const topNavMenu: TopNavMenuData[] = [];

  const enableSaveButton =
    savingToLibraryPermitted ||
    (allowByValue &&
      savingToDashboardPermitted &&
      !options.isByValueMode &&
      !options.showSaveAndReturn);

  const saveButtonLabel = options.isByValueMode
    ? i18n.translate('xpack.lens.app.addToLibrary', {
        defaultMessage: 'Save to library',
      })
    : options.showSaveAndReturn
    ? i18n.translate('xpack.lens.app.saveAs', {
        defaultMessage: 'Save as',
      })
    : i18n.translate('xpack.lens.app.save', {
        defaultMessage: 'Save',
      });

  if (contextOriginatingApp && !showCancel) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      run: actions.goBack,
      className: 'lnsNavItem__withDivider',
      testId: 'lnsApp_goBackToAppButton',
      description: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      disableButton: false,
    });
  }

  if (showOpenInDiscover) {
    const exploreDataInDiscoverLabel = i18n.translate('xpack.lens.app.exploreDataInDiscover', {
      defaultMessage: 'Explore data in Discover',
    });

    topNavMenu.push({
      label: exploreDataInDiscoverLabel,
      run: () => {},
      testId: 'lnsApp_openInDiscover',
      className: 'lnsNavItem__withDivider',
      description: exploreDataInDiscoverLabel,
      disableButton: Boolean(tooltips.showUnderlyingDataWarning()),
      tooltip: tooltips.showUnderlyingDataWarning,
      target: '_blank',
      href: actions.getUnderlyingDataUrl(),
    });
  }

  topNavMenu.push({
    label: i18n.translate('xpack.lens.app.inspect', {
      defaultMessage: 'Inspect',
    }),
    run: actions.inspect,
    testId: 'lnsApp_inspectButton',
    description: i18n.translate('xpack.lens.app.inspectAriaLabel', {
      defaultMessage: 'inspect',
    }),
    disableButton: false,
  });

  topNavMenu.push({
    label: i18n.translate('xpack.lens.app.downloadCSV', {
      defaultMessage: 'Download as CSV',
    }),
    run: actions.exportToCSV,
    testId: 'lnsApp_downloadCSVButton',
    description: i18n.translate('xpack.lens.app.downloadButtonAriaLabel', {
      defaultMessage: 'Download the data as CSV file',
    }),
    disableButton: !enableExportToCSV,
    tooltip: tooltips.showExportWarning,
  });

  topNavMenu.push({
    label: i18n.translate('xpack.lens.app.settings', {
      defaultMessage: 'Settings',
    }),
    run: actions.openSettings,
    className: 'lnsNavItem__withDivider',
    testId: 'lnsApp_settingsButton',
    description: i18n.translate('xpack.lens.app.settingsAriaLabel', {
      defaultMessage: 'Open the Lens settings menu',
    }),
  });

  if (showCancel) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.cancel', {
        defaultMessage: 'Cancel',
      }),
      run: actions.cancel,
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
    run: actions.showSaveModal,
    testId: 'lnsApp_saveButton',
    description: i18n.translate('xpack.lens.app.saveButtonAriaLabel', {
      defaultMessage: 'Save the current lens visualization',
    }),
    disableButton: !enableSaveButton,
  });

  if (showSaveAndReturn) {
    topNavMenu.push({
      label: contextFromEmbeddable
        ? i18n.translate('xpack.lens.app.saveAndReplace', {
            defaultMessage: 'Save and replace',
          })
        : i18n.translate('xpack.lens.app.saveAndReturn', {
            defaultMessage: 'Save and return',
          }),
      emphasize: true,
      iconType: contextFromEmbeddable ? 'save' : 'checkInCircleFilled',
      run: actions.saveAndReturn,
      testId: 'lnsApp_saveAndReturnButton',
      disableButton: !isSaveable,
      description: i18n.translate('xpack.lens.app.saveAndReturnButtonAriaLabel', {
        defaultMessage: 'Save the current lens visualization and return to the last app',
      }),
    });
  }

  if (showReplaceInDashboard) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.replaceInDashboard', {
        defaultMessage: 'Replace in dashboard',
      }),
      emphasize: true,
      iconType: 'merge',
      run: actions.saveAndReturn,
      testId: 'lnsApp_replaceInDashboardButton',
      disableButton: !isSaveable,
      description: i18n.translate('xpack.lens.app.replaceInDashboardButtonAriaLabel', {
        defaultMessage:
          'Replace legacy visualization with lens visualization and return to the dashboard',
      }),
    });
  }

  if (showReplaceInCanvas) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.replaceInCanvas', {
        defaultMessage: 'Replace in canvas',
      }),
      emphasize: true,
      iconType: 'merge',
      run: actions.saveAndReturn,
      testId: 'lnsApp_replaceInCanvasButton',
      disableButton: !isSaveable,
      description: i18n.translate('xpack.lens.app.replaceInCanvasButtonAriaLabel', {
        defaultMessage:
          'Replace legacy visualization with lens visualization and return to the canvas',
      }),
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
}: LensTopNavMenuProps) => {
  const {
    data,
    fieldFormats,
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
        const dataView = await data.dataViews.get(dataViewId);
        setCurrentIndexPattern(dataView ?? indexPatterns[0]);
      }
    };

    setCurrentPattern();
  }, [activeDatasourceId, datasourceMap, datasourceStates, indexPatterns, data.dataViews]);

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
    return getLayerMetaInfo(
      datasourceMap[activeDatasourceId],
      datasourceStates[activeDatasourceId].state,
      activeData,
      dataViews.indexPatterns,
      data.query.timefilter.timefilter.getTime(),
      application.capabilities
    );
  }, [
    activeDatasourceId,
    discoverLocator,
    datasourceMap,
    datasourceStates,
    activeData,
    dataViews.indexPatterns,
    data.query.timefilter.timefilter,
    application.capabilities,
  ]);

  const lensStore = useStore();

  const topNavConfig = useMemo(() => {
    const showReplaceInDashboard =
      initialContext?.originatingApp === 'dashboards' &&
      !(initialInput as LensByReferenceInput)?.savedObjectId;
    const showReplaceInCanvas =
      initialContext?.originatingApp === 'canvas' &&
      !(initialInput as LensByReferenceInput)?.savedObjectId;
    const contextFromEmbeddable =
      initialContext && 'isEmbeddable' in initialContext && initialContext.isEmbeddable;
    const baseMenuEntries = getLensTopNavConfig({
      showSaveAndReturn:
        !(showReplaceInDashboard || showReplaceInCanvas) &&
        (Boolean(
          isLinkedToOriginatingApp &&
            // Temporarily required until the 'by value' paradigm is default.
            (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
        ) ||
          Boolean(initialContextIsEmbedded)),
      enableExportToCSV: Boolean(isSaveable && activeData && Object.keys(activeData).length),
      showOpenInDiscover: Boolean(layerMetaInfo?.isVisible),
      isByValueMode: getIsByValueMode(),
      allowByValue: dashboardFeatureFlag.allowByValueEmbeddables,
      showCancel: Boolean(isLinkedToOriginatingApp),
      savingToLibraryPermitted,
      savingToDashboardPermitted,
      isSaveable,
      contextOriginatingApp,
      showReplaceInDashboard,
      showReplaceInCanvas,
      contextFromEmbeddable,
      tooltips: {
        showExportWarning: () => {
          if (activeData) {
            const datatables = Object.values(activeData);
            const formulaDetected = datatables.some((datatable) => {
              return tableHasFormulas(datatable.columns, datatable.rows);
            });
            if (formulaDetected) {
              return i18n.translate('xpack.lens.app.downloadButtonFormulasWarning', {
                defaultMessage:
                  'Your CSV contains characters that spreadsheet applications might interpret as formulas.',
              });
            }
          }
          return undefined;
        },
        showUnderlyingDataWarning: () => {
          return layerMetaInfo?.error;
        },
      },
      actions: {
        inspect: () => lensInspector.inspect({ title }),
        exportToCSV: () => {
          if (!activeData) {
            return;
          }
          const datatables = Object.values(activeData);
          const content = datatables.reduce<Record<string, { content: string; type: string }>>(
            (memo, datatable, i) => {
              // skip empty datatables
              if (datatable) {
                const postFix = datatables.length > 1 ? `-${i + 1}` : '';

                memo[`${title || unsavedTitle}${postFix}.csv`] = {
                  content: exporters.datatableToCSV(datatable, {
                    csvSeparator: uiSettings.get('csv:separator', ','),
                    quoteValues: uiSettings.get('csv:quoteValues', true),
                    formatFactory: fieldFormats.deserialize,
                    escapeFormulaValues: false,
                  }),
                  type: exporters.CSV_MIME_TYPE,
                };
              }
              return memo;
            },
            {}
          );
          if (content) {
            downloadMultipleAs(content);
          }
        },
        saveAndReturn: () => {
          if (isSaveable) {
            // disabling the validation on app leave because the document has been saved.
            onAppLeave((actions) => {
              return actions.default();
            });
            runSave(
              {
                newTitle:
                  title ||
                  (initialContext && 'isEmbeddable' in initialContext && initialContext.isEmbeddable
                    ? i18n.translate('xpack.lens.app.convertedLabel', {
                        defaultMessage: '{title} (converted)',
                        values: {
                          title:
                            initialContext.title || `${initialContext.visTypeTitle} visualization`,
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
        showSaveModal: () => {
          if (savingToDashboardPermitted || savingToLibraryPermitted) {
            setIsSaveModalVisible(true);
          }
        },
        goBack: () => {
          if (contextOriginatingApp) {
            goBackToOriginatingApp?.();
          }
        },
        cancel: () => {
          if (redirectToOrigin) {
            redirectToOrigin();
          }
        },
        getUnderlyingDataUrl: () => {
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
        openSettings: (anchorElement: HTMLElement) =>
          toggleSettingsMenuOpen({
            lensStore,
            anchorElement,
            theme$,
          }),
      },
    });
    return [...(additionalMenuEntries || []), ...baseMenuEntries];
  }, [
    isLinkedToOriginatingApp,
    dashboardFeatureFlag.allowByValueEmbeddables,
    initialInput,
    initialContextIsEmbedded,
    isSaveable,
    activeData,
    layerMetaInfo,
    getIsByValueMode,
    savingToLibraryPermitted,
    savingToDashboardPermitted,
    contextOriginatingApp,
    additionalMenuEntries,
    lensInspector,
    title,
    unsavedTitle,
    uiSettings,
    fieldFormats.deserialize,
    onAppLeave,
    runSave,
    attributeService,
    setIsSaveModalVisible,
    goBackToOriginatingApp,
    redirectToOrigin,
    discoverLocator,
    query,
    filters,
    indexPatterns,
    dataViews.indexPatterns,
    data.query.timefilter.timefilter,
    isOnTextBasedMode,
    lensStore,
    theme$,
    initialContext,
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
    adHocDataViews: indexPatterns.filter((pattern) => !pattern.isPersisted()),
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
