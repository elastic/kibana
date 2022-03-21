/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import {
  LensAppServices,
  LensTopNavActions,
  LensTopNavMenuProps,
  LensTopNavTooltips,
} from './types';
import type { StateSetter } from '../types';
import { downloadMultipleAs } from '../../../../../src/plugins/share/public';
import { trackUiEvent } from '../lens_ui_telemetry';
import { tableHasFormulas } from '../../../../../src/plugins/data/common';
import { exporters } from '../../../../../src/plugins/data/public';
import type { DataView } from '../../../../../src/plugins/data_views/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  setState,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
  updateDatasourceState,
} from '../state_management';
import {
  getIndexPatternsObjects,
  getIndexPatternsIds,
  getResolvedDateRange,
  handleIndexPatternChange,
  refreshIndexPatternsList,
} from '../utils';
import {
  combineQueryAndFilters,
  getLayerMetaInfo,
  getShowUnderlyingDataLabel,
} from './show_underlying_data';

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

  if (contextOriginatingApp) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      run: actions.goBack,
      className: 'lnsNavItem__goBack',
      testId: 'lnsApp_goBackToAppButton',
      description: i18n.translate('xpack.lens.app.goBackLabel', {
        defaultMessage: `Go back to {contextOriginatingApp}`,
        values: { contextOriginatingApp },
      }),
      disableButton: false,
    });
  }

  if (showOpenInDiscover) {
    topNavMenu.push({
      label: getShowUnderlyingDataLabel(),
      run: () => {},
      testId: 'lnsApp_openInDiscover',
      description: i18n.translate('xpack.lens.app.openInDiscoverAriaLabel', {
        defaultMessage: 'Open underlying data in Discover',
      }),
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
    iconType: !showSaveAndReturn ? 'save' : undefined,
    emphasize: !showSaveAndReturn,
    run: actions.showSaveModal,
    testId: 'lnsApp_saveButton',
    description: i18n.translate('xpack.lens.app.saveButtonAriaLabel', {
      defaultMessage: 'Save the current lens visualization',
    }),
    disableButton: !enableSaveButton,
  });

  if (showSaveAndReturn) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.saveAndReturn', {
        defaultMessage: 'Save and return',
      }),
      emphasize: true,
      iconType: 'checkInCircleFilled',
      run: actions.saveAndReturn,
      testId: 'lnsApp_saveAndReturnButton',
      disableButton: !isSaveable,
      description: i18n.translate('xpack.lens.app.saveAndReturnButtonAriaLabel', {
        defaultMessage: 'Save the current lens visualization and return to the last app',
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
  title,
  goBackToOriginatingApp,
  contextOriginatingApp,
  initialContextIsEmbedded,
  topNavMenuEntryGenerators,
  initialContext,
}: LensTopNavMenuProps) => {
  const {
    data,
    fieldFormats,
    navigation,
    uiSettings,
    application,
    attributeService,
    discover,
    dashboardFeatureFlag,
    dataViewFieldEditor,
    dataViewEditor,
    dataViews,
  } = useKibana<LensAppServices>().services;

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = React.useCallback(
    (state: Partial<LensAppState>) => dispatch(setState(state)),
    [dispatch]
  );

  const [indexPatterns, setIndexPatterns] = useState<DataView[]>([]);
  const [rejectedIndexPatterns, setRejectedIndexPatterns] = useState<string[]>([]);
  const editPermission = dataViewFieldEditor.userPermissions.editIndexPattern();
  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

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
  } = useLensSelector((state) => state.lens);
  const allLoaded = Object.values(datasourceStates).every(({ isLoading }) => isLoading === false);

  useEffect(() => {
    const activeDatasource =
      datasourceMap && activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
        ? datasourceMap[activeDatasourceId]
        : undefined;
    if (!activeDatasource) {
      return;
    }
    const indexPatternIds = getIndexPatternsIds({
      activeDatasources: Object.keys(datasourceStates).reduce(
        (acc, datasourceId) => ({
          ...acc,
          [datasourceId]: datasourceMap[datasourceId],
        }),
        {}
      ),
      datasourceStates,
    });
    const hasIndexPatternsChanged =
      indexPatterns.length + rejectedIndexPatterns.length !== indexPatternIds.length ||
      indexPatternIds.some(
        (id) =>
          ![...indexPatterns.map((ip) => ip.id), ...rejectedIndexPatterns].find(
            (loadedId) => loadedId === id
          )
      );

    // Update the cached index patterns if the user made a change to any of them
    if (hasIndexPatternsChanged) {
      getIndexPatternsObjects(indexPatternIds, dataViews).then(
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
    indexPatterns,
    dataViews,
  ]);

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  const { TopNavMenu } = navigation.ui;
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
  ]);

  const layerMetaInfo = useMemo(() => {
    if (!activeDatasourceId || !discover) {
      return;
    }
    return getLayerMetaInfo(
      datasourceMap[activeDatasourceId],
      datasourceStates[activeDatasourceId].state,
      activeData,
      application.capabilities
    );
  }, [
    activeData,
    activeDatasourceId,
    datasourceMap,
    datasourceStates,
    discover,
    application.capabilities,
  ]);

  const topNavConfig = useMemo(() => {
    const baseMenuEntries = getLensTopNavConfig({
      showSaveAndReturn:
        Boolean(
          isLinkedToOriginatingApp &&
            // Temporarily required until the 'by value' paradigm is default.
            (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
        ) || Boolean(initialContextIsEmbedded),
      enableExportToCSV: Boolean(isSaveable && activeData && Object.keys(activeData).length),
      showOpenInDiscover: Boolean(layerMetaInfo?.isVisible),
      isByValueMode: getIsByValueMode(),
      allowByValue: dashboardFeatureFlag.allowByValueEmbeddables,
      showCancel: Boolean(isLinkedToOriginatingApp),
      savingToLibraryPermitted,
      savingToDashboardPermitted,
      isSaveable,
      contextOriginatingApp,
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
                newTitle: title || '',
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
          if (error || !discover || !meta) {
            return;
          }
          const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
            query,
            filters,
            meta,
            indexPatterns
          );

          return discover.locator!.getRedirectUrl({
            indexPatternId: meta.id,
            timeRange: data.query.timefilter.timefilter.getTime(),
            filters: newFilters,
            query: newQuery,
            columns: meta.columns,
          });
        },
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
    discover,
    query,
    filters,
    indexPatterns,
    data.query.timefilter.timefilter,
  ]);

  const onQuerySubmitWrapped = useCallback(
    (payload) => {
      const { dateRange, query: newQuery } = payload;
      const currentRange = data.query.timefilter.timefilter.getTime();
      if (dateRange.from !== currentRange.from || dateRange.to !== currentRange.to) {
        data.query.timefilter.timefilter.setTime(dateRange);
        trackUiEvent('app_date_change');
      } else {
        // Query has changed, renew the session id.
        // recalculate resolvedDateRange (relevant for relative time range)
        dispatchSetState({
          searchSessionId: data.search.session.start(),
          resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
        });
        trackUiEvent('app_query_change');
      }
      if (newQuery) {
        if (!isEqual(newQuery, query)) {
          dispatchSetState({ query: newQuery });
        }
      }
    },
    [data.query.timefilter.timefilter, data.search.session, dispatchSetState, query]
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

  const currentIndexPattern = indexPatterns[0];

  const setDatasourceState: StateSetter<unknown> = useMemo(() => {
    return (updater) => {
      dispatch(
        updateDatasourceState({
          updater,
          datasourceId: activeDatasourceId!,
          clearStagedPreview: true,
        })
      );
    };
  }, [activeDatasourceId, dispatch]);

  const refreshFieldList = useCallback(async () => {
    if (currentIndexPattern && currentIndexPattern.id) {
      refreshIndexPatternsList({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        indexPatternId: currentIndexPattern.id,
        setDatasourceState,
      });
    }
    // start a new session so all charts are refreshed
    data.search.session.start();
  }, [
    currentIndexPattern,
    data.search.session,
    datasourceMap,
    datasourceStates,
    setDatasourceState,
  ]);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (currentIndexPattern?.id) {
              const indexPatternInstance = await data.dataViews.get(currentIndexPattern?.id);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: indexPatternInstance,
                },
                fieldName,
                onSave: async () => {
                  refreshFieldList();
                },
              });
            }
          }
        : undefined,
    [editPermission, currentIndexPattern?.id, data.dataViews, dataViewFieldEditor, refreshFieldList]
  );

  const addField = useMemo(
    () => (editPermission && editField ? () => editField(undefined, 'add') : undefined),
    [editField, editPermission]
  );

  const createNewDataView = useCallback(() => {
    const dataViewEditPermission = dataViewEditor.userPermissions.editDataView;
    if (!dataViewEditPermission) {
      return;
    }
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          handleIndexPatternChange({
            activeDatasources: Object.keys(datasourceStates).reduce(
              (acc, datasourceId) => ({
                ...acc,
                [datasourceId]: datasourceMap[datasourceId],
              }),
              {}
            ),
            datasourceStates,
            indexPatternId: dataView.id,
            setDatasourceState,
          });
        }
      },
    });
  }, [dataViewEditor, datasourceMap, datasourceStates, setDatasourceState]);

  const dataViewPickerProps = {
    trigger: {
      label: currentIndexPattern?.title || '',
      'data-test-subj': 'lns-dataView-switch-link',
      title: currentIndexPattern?.title || '',
    },
    currentDataViewId: currentIndexPattern?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onChangeDataView: (newIndexPatternId: string) =>
      handleIndexPatternChange({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        datasourceStates,
        indexPatternId: newIndexPatternId,
        setDatasourceState,
      }),
  };

  return (
    <TopNavMenu
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
              datasourceStates[activeDatasourceId].state
            )
        )
      }
      showQueryBar={true}
      showFilterBar={true}
      data-test-subj="lnsApp_topNav"
      screenTitle={'lens'}
      appName={'lens'}
    />
  );
};
