/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  getNavigation,
  getCoreChrome,
  getMapsCapabilities,
  getInspector,
  getToasts,
  getCoreI18n,
  getData,
  getUiSettings,
} from '../../../kibana_services';
import {
  SavedObjectSaveModal,
  showSaveModal,
} from '../../../../../../../src/plugins/saved_objects/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { updateBreadcrumbs } from '../breadcrumbs';

/**
 * @return {null}
 */
export function MapsTopNavMenu({
  savedMap,
  query,
  onQueryChange,
  onQuerySaved,
  onSavedQueryUpdated,
  savedQuery,
  time,
  refreshConfig,
  setRefreshConfig,
  setRefreshStoreConfig,
  initialLayerListConfig,
  isVisible,
  indexPatterns,
  updateFiltersAndDispatch,
  isSaveDisabled,
  closeFlyout,
  enableFullScreen,
  openMapSettings,
  syncSavedMap,
  inspectorAdapters,
}) {
  const { TopNavMenu } = getNavigation().ui;
  const { filterManager } = getData().query;
  const showSaveQuery = getMapsCapabilities().saveQuery;
  const onClearSavedQuery = () => {
    onQuerySaved(undefined);
    onQueryChange({
      filters: filterManager.getGlobalFilters(),
      query: {
        query: '',
        language: getUiSettings().get('search:queryLanguage'),
      },
    });
  };

  // Nav settings
  const [isOpenSettingsDisabled, setIsOpenSettingsDisabled] = useState(false);
  const config = getTopNavConfig(
    savedMap,
    initialLayerListConfig,
    isOpenSettingsDisabled,
    setIsOpenSettingsDisabled,
    isSaveDisabled,
    closeFlyout,
    enableFullScreen,
    openMapSettings,
    syncSavedMap,
    inspectorAdapters
  );

  const submitQuery = function ({ dateRange, query }) {
    onQueryChange({
      query,
      time: dateRange,
      refresh: true,
    });
  };

  const onRefreshChange = function ({ isPaused, refreshInterval }) {
    setRefreshConfig(
      {
        isPaused,
        interval: refreshInterval ? refreshInterval : refreshConfig.interval,
      },
      () => setRefreshStoreConfig(refreshConfig)
    );
    // TODO: Global sync state
    // syncAppAndGlobalState();
  };

  return isVisible ? (
    <TopNavMenu
      appName="maps"
      config={config}
      indexPatterns={indexPatterns || []}
      filters={filterManager.getFilters()}
      query={query}
      onQuerySubmit={submitQuery}
      onFiltersUpdated={updateFiltersAndDispatch}
      dateRangeFrom={time.from}
      dateRangeTo={time.to}
      isRefreshPaused={refreshConfig.isPaused}
      refreshInterval={refreshConfig.interval}
      onRefreshChange={onRefreshChange}
      showSearchBar={true}
      showFilterBar={true}
      showDatePicker={true}
      showSaveQuery={showSaveQuery}
      savedQuery={savedQuery}
      onSaved={onQuerySaved}
      onSavedQueryUpdated={onSavedQueryUpdated}
      onClearSavedQuery={onClearSavedQuery}
    />
  ) : null;
}

function getTopNavConfig(
  savedMap,
  initialLayerListConfig,
  isOpenSettingsDisabled,
  setIsOpenSettingsDisabled,
  isSaveDisabled,
  closeFlyout,
  enableFullScreen,
  openMapSettings,
  syncSavedMap,
  inspectorAdapters
) {
  return [
    {
      id: 'full-screen',
      label: i18n.translate('xpack.maps.mapController.fullScreenButtonLabel', {
        defaultMessage: `full screen`,
      }),
      description: i18n.translate('xpack.maps.mapController.fullScreenDescription', {
        defaultMessage: `full screen`,
      }),
      testId: 'mapsFullScreenMode',
      run() {
        getCoreChrome().setIsVisible(false);
        enableFullScreen();
      },
    },
    {
      id: 'inspect',
      label: i18n.translate('xpack.maps.mapController.openInspectorButtonLabel', {
        defaultMessage: `inspect`,
      }),
      description: i18n.translate('xpack.maps.mapController.openInspectorDescription', {
        defaultMessage: `Open Inspector`,
      }),
      testId: 'openInspectorButton',
      run() {
        getInspector().open(inspectorAdapters, {});
      },
    },
    {
      id: 'mapSettings',
      label: i18n.translate('xpack.maps.mapController.openSettingsButtonLabel', {
        defaultMessage: `Map settings`,
      }),
      description: i18n.translate('xpack.maps.mapController.openSettingsDescription', {
        defaultMessage: `Open map settings`,
      }),
      testId: 'openSettingsButton',
      disableButton() {
        return isOpenSettingsDisabled;
      },
      run() {
        openMapSettings();
      },
    },
    ...(getMapsCapabilities().save
      ? [
          {
            id: 'save',
            label: i18n.translate('xpack.maps.mapController.saveMapButtonLabel', {
              defaultMessage: `save`,
            }),
            description: i18n.translate('xpack.maps.mapController.saveMapDescription', {
              defaultMessage: `Save map`,
            }),
            testId: 'mapSaveButton',
            disableButton() {
              return isSaveDisabled;
            },
            tooltip() {
              if (isSaveDisabled) {
                return i18n.translate('xpack.maps.mapController.saveMapDisabledButtonTooltip', {
                  defaultMessage: 'Save or Cancel your layer changes before saving',
                });
              }
            },
            run: async () => {
              const onSave = ({
                newTitle,
                newCopyOnSave,
                isTitleDuplicateConfirmed,
                onTitleDuplicate,
              }) => {
                const currentTitle = savedMap.title;
                savedMap.title = newTitle;
                savedMap.copyOnSave = newCopyOnSave;
                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                };
                return doSave(
                  savedMap,
                  saveOptions,
                  initialLayerListConfig,
                  closeFlyout,
                  syncSavedMap
                ).then((response) => {
                  // If the save wasn't successful, put the original values back.
                  if (!response.id || response.error) {
                    savedMap.title = currentTitle;
                  }
                  return response;
                });
              };

              const saveModal = (
                <SavedObjectSaveModal
                  onSave={onSave}
                  onClose={() => {}}
                  title={savedMap.title}
                  showCopyOnSave={!!savedMap.id}
                  objectType={MAP_SAVED_OBJECT_TYPE}
                  showDescription={false}
                />
              );
              showSaveModal(saveModal, getCoreI18n().Context);
            },
          },
        ]
      : []),
  ];
}

async function doSave(savedMap, saveOptions, initialLayerListConfig, closeFlyout, syncSavedMap) {
  closeFlyout();
  syncSavedMap(savedMap);
  let id;

  try {
    id = await savedMap.save(saveOptions);
    getCoreChrome().docTitle.change(savedMap.title);
  } catch (err) {
    getToasts().addDanger({
      title: i18n.translate('xpack.maps.mapController.saveErrorMessage', {
        defaultMessage: `Error on saving '{title}'`,
        values: { title: savedMap.title },
      }),
      text: err.message,
      'data-test-subj': 'saveMapError',
    });
    return { error: err };
  }

  if (id) {
    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.mapController.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: savedMap.title },
      }),
      'data-test-subj': 'saveMapSuccess',
    });

    updateBreadcrumbs(savedMap, initialLayerListConfig);

    // TODO: handle redirect if id doesn't match
    // if (savedMap.id !== $route.current.params.id) {
    //   $scope.$evalAsync(() => {
    //     kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
    //   });
    // }
  }
  return { id };
}
