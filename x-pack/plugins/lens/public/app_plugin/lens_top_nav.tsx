/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { LensAppServices, LensTopNavActions, LensTopNavMenuProps } from './types';
import { downloadMultipleAs } from '../../../../../src/plugins/share/public';
import { trackUiEvent } from '../lens_ui_telemetry';
import { exporters } from '../../../../../src/plugins/data/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  setState as setAppState,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
} from '../state_management';

function getLensTopNavConfig(options: {
  showSaveAndReturn: boolean;
  enableExportToCSV: boolean;
  showCancel: boolean;
  isByValueMode: boolean;
  allowByValue: boolean;
  actions: LensTopNavActions;
  savingToLibraryPermitted: boolean;
  savingToDashboardPermitted: boolean;
}): TopNavMenuData[] {
  const {
    actions,
    showCancel,
    allowByValue,
    enableExportToCSV,
    showSaveAndReturn,
    savingToLibraryPermitted,
    savingToDashboardPermitted,
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
      disableButton: !savingToDashboardPermitted,
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
  setIsSaveModalVisible,
  getIsByValueMode,
  runSave,
  onAppLeave,
  redirectToOrigin,
}: LensTopNavMenuProps) => {
  const {
    data,
    navigation,
    uiSettings,
    application,
    attributeService,
    dashboardFeatureFlag,
  } = useKibana<LensAppServices>().services;

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = React.useCallback(
    (state: Partial<LensAppState>) => dispatch(setAppState(state)),
    [dispatch]
  );

  const {
    isSaveable,
    isLinkedToOriginatingApp,
    indexPatternsForTopNav,
    query,
    lastKnownDoc,
    activeData,
    savedQuery,
  } = useLensSelector((state) => state.app);

  const { TopNavMenu } = navigation.ui;
  const { from, to } = data.query.timefilter.timefilter.getTime();

  const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);
  const savingToDashboardPermitted = Boolean(
    isSaveable && application.capabilities.dashboard?.showWriteControls
  );

  const unsavedTitle = i18n.translate('xpack.lens.app.unsavedFilename', {
    defaultMessage: 'unsaved',
  });
  const topNavConfig = useMemo(
    () =>
      getLensTopNavConfig({
        showSaveAndReturn: Boolean(
          isLinkedToOriginatingApp &&
            // Temporarily required until the 'by value' paradigm is default.
            (dashboardFeatureFlag.allowByValueEmbeddables || Boolean(initialInput))
        ),
        enableExportToCSV: Boolean(isSaveable && activeData && Object.keys(activeData).length),
        isByValueMode: getIsByValueMode(),
        allowByValue: dashboardFeatureFlag.allowByValueEmbeddables,
        showCancel: Boolean(isLinkedToOriginatingApp),
        savingToLibraryPermitted,
        savingToDashboardPermitted,
        actions: {
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

                  memo[`${lastKnownDoc?.title || unsavedTitle}${postFix}.csv`] = {
                    content: exporters.datatableToCSV(datatable, {
                      csvSeparator: uiSettings.get('csv:separator', ','),
                      quoteValues: uiSettings.get('csv:quoteValues', true),
                      formatFactory: data.fieldFormats.deserialize,
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
            if (savingToDashboardPermitted && lastKnownDoc) {
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
            if (savingToDashboardPermitted || savingToLibraryPermitted) {
              setIsSaveModalVisible(true);
            }
          },
          cancel: () => {
            if (redirectToOrigin) {
              redirectToOrigin();
            }
          },
        },
      }),
    [
      activeData,
      attributeService,
      dashboardFeatureFlag.allowByValueEmbeddables,
      data.fieldFormats.deserialize,
      getIsByValueMode,
      initialInput,
      isLinkedToOriginatingApp,
      isSaveable,
      lastKnownDoc,
      onAppLeave,
      redirectToOrigin,
      runSave,
      savingToDashboardPermitted,
      savingToLibraryPermitted,
      setIsSaveModalVisible,
      uiSettings,
      unsavedTitle,
    ]
  );

  const onQuerySubmitWrapped = useCallback(
    (payload) => {
      const { dateRange, query: newQuery } = payload;
      const currentRange = data.query.timefilter.timefilter.getTime();
      if (dateRange.from !== currentRange.from || dateRange.to !== currentRange.to) {
        data.query.timefilter.timefilter.setTime(dateRange);
        trackUiEvent('app_date_change');
      } else {
        // Query has changed, renew the session id.
        // Time change will be picked up by the time subscription
        dispatchSetState({ searchSessionId: data.search.session.start() });
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
      indexPatterns={indexPatternsForTopNav}
      query={query}
      dateRangeFrom={from}
      dateRangeTo={to}
      indicateNoData={indicateNoData}
      showSearchBar={true}
      showDatePicker={true}
      showQueryBar={true}
      showFilterBar={true}
      data-test-subj="lnsApp_topNav"
      screenTitle={'lens'}
      appName={'lens'}
    />
  );
};
