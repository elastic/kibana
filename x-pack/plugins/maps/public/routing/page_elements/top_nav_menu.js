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
} from '../../kibana_services';
import { enableFullScreen, openMapSettings } from '../../actions/ui_actions';
import { getInspectorAdapters } from '../../reducers/non_serializable_instances';
import {
  SavedObjectSaveModal,
  showSaveModal,
} from '../../../../../../src/plugins/saved_objects/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { removePreviewLayers, updateFlyout } from '../../actions';
import { updateBreadcrumbs } from './breadcrumbs';
import { FLYOUT_STATE } from '../../reducers/ui';

/**
 * @return {null}
 */
export function MapsTopNavMenu(props) {
  const { TopNavMenu } = getNavigation().ui;
  const {
    savedMap,
    store,
    query,
    onQueryChange,
    onQuerySaved,
    onSavedQueryUpdated,
    savedQuery,
    time,
    refreshConfig,
    setRefreshConfig,
    initialLayerListConfig,
    isVisible,
    indexPatterns,
    updateFiltersAndDispatch,
    isSaveDisabled,
  } = props;
  const { filterManager } = getData().query;
  const showSaveQuery = getMapsCapabilities().saveQuery;
  const onClearSavedQuery = () => {
    // setSavedQuery(null);
    // TODO: Update saved query in state
    // delete $state.savedQuery;
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

  return isVisible ? (
    <TopNavMenu
      appName="maps"
      config={topNavConfig(
        store,
        savedMap,
        initialLayerListConfig,
        isOpenSettingsDisabled,
        setIsOpenSettingsDisabled,
        isSaveDisabled
      )}
      indexPatterns={indexPatterns || []}
      filters={filterManager.getFilters()}
      query={query}
      onQuerySubmit={function ({ dateRange, query }) {
        onQueryChange({
          query,
          time: dateRange,
          refresh: true,
        });
      }}
      onFiltersUpdated={updateFiltersAndDispatch}
      dateRangeFrom={time.from}
      dateRangeTo={time.to}
      isRefreshPaused={refreshConfig.isPaused}
      refreshInterval={refreshConfig.interval}
      onRefreshChange={function ({ isPaused, refreshInterval }) {
        setRefreshConfig(
          {
            isPaused,
            interval: refreshInterval ? refreshInterval : refreshConfig.interval,
          },
          () => store.dispatch(setRefreshConfig(refreshConfig))
        );
        // TODO: Global sync state
        // syncAppAndGlobalState();
      }}
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

function topNavConfig(
  store,
  savedMap,
  initialLayerListConfig,
  isOpenSettingsDisabled,
  setIsOpenSettingsDisabled,
  isSaveDisabled
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
        store.dispatch(enableFullScreen());
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
        const inspectorAdapters = getInspectorAdapters(store.getState());
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
        store.dispatch(openMapSettings());
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
                return doSave(store, savedMap, saveOptions, initialLayerListConfig).then(
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

async function doSave(store, savedMap, saveOptions, initialLayerListConfig) {
  await store.dispatch(updateFlyout(FLYOUT_STATE.NONE));
  await store.dispatch(removePreviewLayers());
  savedMap.syncWithStore(store.getState());
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

    updateBreadcrumbs(store, savedMap, initialLayerListConfig);

    // TODO: handle redirect if id doesn't match
    // if (savedMap.id !== $route.current.params.id) {
    //   $scope.$evalAsync(() => {
    //     kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
    //   });
    // }
  }
  return { id };
}
