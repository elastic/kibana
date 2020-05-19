/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import rison from 'rison-node';
import 'ui/directives/listen';
import 'ui/directives/storage';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  getTimeFilter,
  getIndexPatternService,
  getInspector,
  getNavigation,
  getData,
  getCoreI18n,
  getCoreChrome,
  getMapsCapabilities,
  getToasts,
} from '../kibana_services';
import { createMapStore } from '../reducers/store';
import { Provider } from 'react-redux';
import { GisMap } from '../connected_components/gis_map';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import {
  setSelectedLayer,
  setRefreshConfig,
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  clearTransientLayerStateAndCloseFlyout,
  setMapSettings,
} from '../actions/map_actions';
import { DEFAULT_IS_LAYER_TOC_OPEN, FLYOUT_STATE } from '../reducers/ui';
import {
  enableFullScreen,
  updateFlyout,
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
  openMapSettings,
} from '../actions/ui_actions';
import { getIsFullScreen, getFlyoutDisplay } from '../selectors/ui_selectors';
import { copyPersistentState } from '../reducers/util';
import {
  getQueryableUniqueIndexPatternIds,
  hasDirtyState,
  getLayerListRaw,
} from '../selectors/map_selectors';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { getInitialLayers } from '../angular/get_initial_layers';
import { getInitialQuery } from '../angular/get_initial_query';
import { getInitialTimeFilters } from '../angular/get_initial_time_filters';
import { getInitialRefreshConfig } from '../angular/get_initial_refresh_config';
import { MAP_SAVED_OBJECT_TYPE, MAP_APP_PATH } from '../../common/constants';
import { esFilters } from '../../../../../src/plugins/data/public';
import {
  SavedObjectSaveModal,
  showSaveModal,
} from '../../../../../src/plugins/saved_objects/public';
import { loadKbnTopNavDirectives } from '../../../../../src/plugins/kibana_legacy/public';
import { EMPTY_FILTER } from './map_listing';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-maps-root';
const savedQueryService = getData().query.savedQueries;
const { filterManager } = getData().query;
const store = createMapStore();

loadKbnTopNavDirectives(getNavigation().ui);

export class MapViewCreateEdit extends React.Component {
  state = {
    initialLayerListConfig: null,
  };

  static getDerivedStateFromProps(props, state) {
    return {
      savedMap: props.savedMap,
      screenTitle: props.savedMap.title,
      appStateFilters: props.appStateFilters,
      isVisible: props.isVisible,
      mapsAppState: props.mapsAppState,
      kibanaState: props.kibanaState,
    };
  }

  componentDidMount() {
    const { savedMap, mapsAppState, localStorage, globalState } = this.props;
    this.setState({
      query: getInitialQuery({
        mapStateJSON: savedMap.mapStateJSON,
        appState: mapsAppState,
        userQueryLanguage: localStorage.get('kibana.userQueryLanguage'),
      }),
      time: getInitialTimeFilters({
        mapStateJSON: savedMap.mapStateJSON,
        globalState: globalState,
      }),
      refreshConfig: getInitialRefreshConfig({
        mapStateJSON: savedMap.mapStateJSON,
        globalState: globalState,
      }),
      showSaveQuery: getMapsCapabilities().saveQuery,
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const globalDiff = 'TODO:compareProps';
    const localDiff = 'TODO:compareProps';
    const { globalState } = this.props;

    if (globalDiff.includes('time') || globalDiff.includes('filters')) {
      onQueryChange({
        filters: [...globalState.filters, ...this.state.appStateFilters],
        time: globalState.time,
      });
    }
    if (globalDiff.includes('refreshInterval')) {
      $scope.onRefreshChange({ isPaused: globalState.pause, refreshInterval: globalState.value });
    }

    if ((localDiff.includes('query') || localDiff.includes('filters')) && $state.query) {
      onQueryChange({
        filters: [...globalState.filters, ...getAppStateFilters()],
        query: $state.query,
      });
    }
  }

  async onQueryChange({ filters, query, time, refresh }) {
    if (filters) {
      filterManager.setFilters(filters); // Maps and merges filters
      this.setState({
        filters: filterManager.getFilters(),
      });
    }
    if (query) {
      this.setState({ query });
    }
    if (time) {
      this.setState({ time });
    }
    this.syncAppAndGlobalState();
    this.dispatchSetQuery(refresh);
  }

  dispatchSetQuery(refresh) {
    const { filters, query, time } = this.state;
    store.dispatch(
      setQuery({
        filters,
        query,
        timeFilters: time,
        refresh,
      })
    );
  }

  getInitialLayersFromUrlParam() {
    const locationSplit = window.location.href.split('?');
    if (locationSplit.length <= 1) {
      return [];
    }
    const mapAppParams = new URLSearchParams(locationSplit[1]);
    if (!mapAppParams.has('initialLayers')) {
      return [];
    }

    try {
      return rison.decode_array(mapAppParams.get('initialLayers'));
    } catch (e) {
      getToasts().addWarning({
        title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
          defaultMessage: `Inital layers not added to map`,
        }),
        text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
          defaultMessage: `Unable to parse contents of 'initialLayers' parameter. Error: {errorMsg}`,
          values: { errorMsg: e.message },
        }),
      });
      return [];
    }
  }

  syncAppAndGlobalState() {
    // $scope.$evalAsync(() => {
    // appState
    const { globalState } = this.props;
    const { mapsAppState, query, time, refreshConfig } = this.state;

    mapsAppState.query = query;
    mapsAppState.filters = filterManager.getAppFilters();
    mapsAppState.save();

    // globalState
    globalState.time = time;
    globalState.refreshInterval = {
      pause: refreshConfig.isPaused,
      value: refreshConfig.interval,
    };
    globalState.filters = filterManager.getGlobalFilters();
    globalState.save();
    // });
  }
}

app.controller(
  'GisMapController',
  ($scope, $route, kbnUrl, localStorage, AppState, globalState) => {
    /* Saved Queries */

    $scope.$watch(
      () => getMapsCapabilities().saveQuery,
      newCapability => {
        $scope.showSaveQuery = newCapability;
      }
    );

    $scope.onQuerySaved = savedQuery => {
      $scope.savedQuery = savedQuery;
    };

    $scope.onSavedQueryUpdated = savedQuery => {
      $scope.savedQuery = { ...savedQuery };
    };

    $scope.onClearSavedQuery = () => {
      delete $scope.savedQuery;
      delete $state.savedQuery;
      onQueryChange({
        filters: filterManager.getGlobalFilters(),
        query: {
          query: '',
          language: localStorage.get('kibana.userQueryLanguage'),
        },
      });
    };

    function updateStateFromSavedQuery(savedQuery) {
      const savedQueryFilters = savedQuery.attributes.filters || [];
      const globalFilters = filterManager.getGlobalFilters();
      const allFilters = [...savedQueryFilters, ...globalFilters];

      if (savedQuery.attributes.timefilter) {
        if (savedQuery.attributes.timefilter.refreshInterval) {
          $scope.onRefreshChange({
            isPaused: savedQuery.attributes.timefilter.refreshInterval.pause,
            refreshInterval: savedQuery.attributes.timefilter.refreshInterval.value,
          });
        }
        onQueryChange({
          filters: allFilters,
          query: savedQuery.attributes.query,
          time: savedQuery.attributes.timefilter,
        });
      } else {
        onQueryChange({
          filters: allFilters,
          query: savedQuery.attributes.query,
        });
      }
    }

    $scope.$watch('savedQuery', newSavedQuery => {
      if (!newSavedQuery) return;

      $state.savedQuery = newSavedQuery.id;
      updateStateFromSavedQuery(newSavedQuery);
    });

    $scope.$watch(
      () => $state.savedQuery,
      newSavedQueryId => {
        if (!newSavedQueryId) {
          $scope.savedQuery = undefined;
          return;
        }
        if ($scope.savedQuery && newSavedQueryId !== $scope.savedQuery.id) {
          savedQueryService.getSavedQuery(newSavedQueryId).then(savedQuery => {
            $scope.$evalAsync(() => {
              $scope.savedQuery = savedQuery;
              updateStateFromSavedQuery(savedQuery);
            });
          });
        }
      }
    );
    /* End of Saved Queries */

    $scope.indexPatterns = [];
    $scope.onQuerySubmit = function({ dateRange, query }) {
      onQueryChange({
        query,
        time: dateRange,
        refresh: true,
      });
    };
    $scope.updateFiltersAndDispatch = function(filters) {
      onQueryChange({
        filters,
      });
    };
    $scope.onRefreshChange = function({ isPaused, refreshInterval }) {
      $scope.refreshConfig = {
        isPaused,
        interval: refreshInterval ? refreshInterval : $scope.refreshConfig.interval,
      };
      syncAppAndGlobalState();

      store.dispatch(setRefreshConfig($scope.refreshConfig));
    };

    function addFilters(newFilters) {
      newFilters.forEach(filter => {
        filter.$state = { store: esFilters.FilterStateStore.APP_STATE };
      });
      $scope.updateFiltersAndDispatch([...$scope.filters, ...newFilters]);
    }

    function hasUnsavedChanges() {
      const state = store.getState();
      const layerList = getLayerListRaw(state);
      const layerListConfigOnly = copyPersistentState(layerList);

      const savedLayerList = savedMap.getLayerList();

      return !savedLayerList
        ? !_.isEqual(layerListConfigOnly, initialLayerListConfig)
        : // savedMap stores layerList as a JSON string using JSON.stringify.
          // JSON.stringify removes undefined properties from objects.
          // savedMap.getLayerList converts the JSON string back into Javascript array of objects.
          // Need to perform the same process for layerListConfigOnly to compare apples to apples
          // and avoid undefined properties in layerListConfigOnly triggering unsaved changes.
          !_.isEqual(JSON.parse(JSON.stringify(layerListConfigOnly)), savedLayerList);
    }

    function isOnMapNow() {
      return window.location.hash.startsWith(`#/${MAP_SAVED_OBJECT_TYPE}`);
    }

    function beforeUnload(event) {
      if (!isOnMapNow()) {
        return;
      }

      const hasChanged = hasUnsavedChanges();
      if (hasChanged) {
        event.preventDefault();
        event.returnValue = 'foobar'; //this is required for Chrome
      }
    }
    window.addEventListener('beforeunload', beforeUnload);

    async function renderMap() {
      // clear old UI state
      store.dispatch(setSelectedLayer(null));
      store.dispatch(updateFlyout(FLYOUT_STATE.NONE));
      store.dispatch(setReadOnly(!getMapsCapabilities().save));

      handleStoreChanges(store);
      unsubscribe = store.subscribe(() => {
        handleStoreChanges(store);
      });

      // sync store with savedMap mapState
      let savedObjectFilters = [];
      if (savedMap.mapStateJSON) {
        const mapState = JSON.parse(savedMap.mapStateJSON);
        store.dispatch(
          setGotoWithCenter({
            lat: mapState.center.lat,
            lon: mapState.center.lon,
            zoom: mapState.zoom,
          })
        );
        if (mapState.filters) {
          savedObjectFilters = mapState.filters;
        }
        if (mapState.settings) {
          store.dispatch(setMapSettings(mapState.settings));
        }
      }

      if (savedMap.uiStateJSON) {
        const uiState = JSON.parse(savedMap.uiStateJSON);
        store.dispatch(
          setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN))
        );
        store.dispatch(setOpenTOCDetails(_.get(uiState, 'openTOCDetails', [])));
      }

      const layerList = getInitialLayers(savedMap.layerListJSON, getInitialLayersFromUrlParam());
      initialLayerListConfig = copyPersistentState(layerList);
      store.dispatch(replaceLayerList(layerList));
      store.dispatch(setRefreshConfig($scope.refreshConfig));

      const initialFilters = [
        ..._.get(globalState, 'filters', []),
        ...getAppStateFilters(),
        ...savedObjectFilters,
      ];
      await onQueryChange({ filters: initialFilters });

      const root = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      render(
        <Provider store={store}>
          <I18nProvider>
            <GisMap addFilters={addFilters} />
          </I18nProvider>
        </Provider>,
        root
      );
    }
    renderMap();

    let prevIndexPatternIds;
    async function updateIndexPatterns(nextIndexPatternIds) {
      const indexPatterns = [];
      const getIndexPatternPromises = nextIndexPatternIds.map(async indexPatternId => {
        try {
          const indexPattern = await getIndexPatternService().get(indexPatternId);
          indexPatterns.push(indexPattern);
        } catch (err) {
          // unable to fetch index pattern
        }
      });

      await Promise.all(getIndexPatternPromises);
      // ignore outdated results
      if (prevIndexPatternIds !== nextIndexPatternIds) {
        return;
      }
      $scope.$evalAsync(() => {
        $scope.indexPatterns = indexPatterns;
      });
    }

    $scope.isFullScreen = false;
    $scope.isSaveDisabled = false;
    $scope.isOpenSettingsDisabled = false;
    function handleStoreChanges(store) {
      const nextIsFullScreen = getIsFullScreen(store.getState());
      if (nextIsFullScreen !== $scope.isFullScreen) {
        // Must trigger digest cycle for angular top nav to redraw itself when isFullScreen changes
        $scope.$evalAsync(() => {
          $scope.isFullScreen = nextIsFullScreen;
        });
      }

      const nextIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());
      if (nextIndexPatternIds !== prevIndexPatternIds) {
        prevIndexPatternIds = nextIndexPatternIds;
        updateIndexPatterns(nextIndexPatternIds);
      }

      const nextIsSaveDisabled = hasDirtyState(store.getState());
      if (nextIsSaveDisabled !== $scope.isSaveDisabled) {
        $scope.$evalAsync(() => {
          $scope.isSaveDisabled = nextIsSaveDisabled;
        });
      }

      const flyoutDisplay = getFlyoutDisplay(store.getState());
      const nextIsOpenSettingsDisabled = flyoutDisplay !== FLYOUT_STATE.NONE;
      if (nextIsOpenSettingsDisabled !== $scope.isOpenSettingsDisabled) {
        $scope.$evalAsync(() => {
          $scope.isOpenSettingsDisabled = nextIsOpenSettingsDisabled;
        });
      }
    }

    $scope.$on('$destroy', () => {
      window.removeEventListener('beforeunload', beforeUnload);
      visibleSubscription.unsubscribe();
      getCoreChrome().setIsVisible(true);

      if (unsubscribe) {
        unsubscribe();
      }
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (node) {
        unmountComponentAtNode(node);
      }
    });

    const updateBreadcrumbs = () => {
      getCoreChrome().setBreadcrumbs([
        {
          text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
            defaultMessage: 'Maps',
          }),
          onClick: () => {
            if (isOnMapNow() && hasUnsavedChanges()) {
              const navigateAway = window.confirm(
                i18n.translate('xpack.maps.mapController.unsavedChangesWarning', {
                  defaultMessage: `Your unsaved changes might not be saved`,
                })
              );
              if (navigateAway) {
                window.location.hash = '#';
              }
            } else {
              window.location.hash = '#';
            }
          },
        },
        { text: savedMap.title },
      ]);
    };
    updateBreadcrumbs();

    addHelpMenuToAppChrome();

    async function doSave(saveOptions) {
      await store.dispatch(clearTransientLayerStateAndCloseFlyout());
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

        updateBreadcrumbs();

        if (savedMap.id !== $route.current.params.id) {
          $scope.$evalAsync(() => {
            kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
          });
        }
      }
      return { id };
    }

    // Hide angular timepicer/refresh UI from top nav
    getTimeFilter().disableTimeRangeSelector();
    getTimeFilter().disableAutoRefreshSelector();
    $scope.showDatePicker = true; // used by query-bar directive to enable timepikcer in query bar
    $scope.topNavMenu = [
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
          return $scope.isOpenSettingsDisabled;
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
                return $scope.isSaveDisabled;
              },
              tooltip() {
                if ($scope.isSaveDisabled) {
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
                  return doSave(saveOptions).then(response => {
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
                    showCopyOnSave={savedMap.id ? true : false}
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
);
