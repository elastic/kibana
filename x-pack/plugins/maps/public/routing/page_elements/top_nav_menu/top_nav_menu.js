/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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
import { goToSpecifiedPath } from '../../maps_router';

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
  indexPatterns,
  updateFiltersAndDispatch,
  isSaveDisabled,
  closeFlyout,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
  syncAppAndGlobalState,
  setBreadcrumbs,
  isOpenSettingsDisabled,
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
  const config = getTopNavConfig(
    savedMap,
    isOpenSettingsDisabled,
    isSaveDisabled,
    closeFlyout,
    enableFullScreen,
    openMapSettings,
    inspectorAdapters,
    setBreadcrumbs
  );

  const submitQuery = function ({ dateRange, query }) {
    onQueryChange({
      query,
      time: dateRange,
      refresh: true,
    });
  };

  const onRefreshChange = function ({ isPaused, refreshInterval }) {
    const newRefreshConfig = {
      isPaused,
      interval: isNaN(refreshInterval) ? refreshConfig.interval : refreshInterval,
    };
    setRefreshConfig(newRefreshConfig, () => {
      setRefreshStoreConfig(newRefreshConfig);
      syncAppAndGlobalState();
    });
  };

  return (
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
  );
}

function getTopNavConfig(
  savedMap,
  isOpenSettingsDisabled,
  isSaveDisabled,
  closeFlyout,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
  setBreadcrumbs
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
                return doSave(savedMap, saveOptions, closeFlyout, setBreadcrumbs).then(
                  (response) => {
                    // If the save wasn't successful, put the original values back.
                    if (!response.id || response.error) {
                      savedMap.title = currentTitle;
                    }
                    return response;
                  }
                );
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

async function doSave(savedMap, saveOptions, closeFlyout, setBreadcrumbs) {
  closeFlyout();
  savedMap.syncWithStore();
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
    goToSpecifiedPath(`/map/${id}${window.location.hash}`);
    setBreadcrumbs();

    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.mapController.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: savedMap.title },
      }),
      'data-test-subj': 'saveMapSuccess',
    });
  }
  return { id };
}
