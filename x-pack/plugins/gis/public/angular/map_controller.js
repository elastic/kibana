/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { applyTheme } from 'ui/theme';
import { Provider } from 'react-redux';
import { getStore } from '../store/store';
import { GisMap } from '../components/gis_map';
import {
  setSelectedLayer,
  setRefreshConfig,
  setGoto,
  replaceLayerList,
  setQuery,
} from '../actions/store_actions';
import { getIsDarkTheme, updateFlyout, FLYOUT_STATE } from '../store/ui';
import { getDataSources, getUniqueIndexPatternIds } from '../selectors/map_selectors';
import { Inspector } from 'ui/inspector';
import { inspectorAdapters, indexPatternService } from '../kibana_services';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { showOptionsPopover } from '../components/top_nav/show_options_popover';
import { toastNotifications } from 'ui/notify';
import { getInitialLayers } from './get_initial_layers';
import { getInitialQuery } from './get_initial_query';
import { getInitialTimeFilters } from './get_initial_time_filters';
import { getInitialRefreshConfig } from './get_initial_refresh_config';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-gis-root';


const app = uiModules.get('app/gis', []);

app.controller('GisMapController', ($scope, $route, config, kbnUrl, localStorage, AppState, globalState) => {

  const savedMap = $scope.map = $route.current.locals.map;
  let isDarkTheme;
  let unsubscribe;

  inspectorAdapters.requests.reset();

  $scope.$listen(globalState, 'fetch_with_changes', (diff) => {
    if (diff.includes('time')) {
      $scope.updateQueryAndDispatch({ query: $scope.query, dateRange: globalState.time });
    }
    if (diff.includes('refreshInterval')) {
      $scope.onRefreshChange({ isPaused: globalState.pause, refreshInterval: globalState.value });
    }
  });

  const $state = new AppState();
  $scope.$listen($state, 'fetch_with_changes', function (diff) {
    if (diff.includes('query')) {
      $scope.updateQueryAndDispatch({ query: $state.query });
    }
  });

  function syncAppAndGlobalState() {
    $scope.$evalAsync(() => {
      $state.query = $scope.query;
      $state.save();
      globalState.time = $scope.time;
      globalState.refreshInterval = {
        pause: $scope.refreshConfig.isPaused,
        value: $scope.refreshConfig.interval,
      };
      globalState.save();
    });
  }

  $scope.query = getInitialQuery({
    mapStateJSON: savedMap.mapStateJSON,
    appState: $state,
    userQueryLanguage: localStorage.get('kibana.userQueryLanguage')
  });
  $scope.time = getInitialTimeFilters({
    mapStateJSON: savedMap.mapStateJSON,
    globalState: globalState,
  });
  $scope.refreshConfig = getInitialRefreshConfig({
    mapStateJSON: savedMap.mapStateJSON,
    globalState: globalState,
  });
  syncAppAndGlobalState();

  $scope.indexPatterns = [];
  $scope.updateQueryAndDispatch = function ({ dateRange, query }) {
    $scope.query = query;
    $scope.time = dateRange;
    getStore().then(store => {
      // ignore outdated query
      if ($scope.query !== query && $scope.time !== dateRange) {
        return;
      }

      store.dispatch(setQuery({ query: $scope.query, timeFilters: $scope.time }));

      syncAppAndGlobalState();
    });
  };
  $scope.onRefreshChange = function ({ isPaused, refreshInterval }) {
    $scope.refreshConfig = {
      isPaused,
      interval: refreshInterval ? refreshInterval : $scope.refreshConfig.interval
    };
    getStore().then(store => {
      // ignore outdated
      if ($scope.refreshConfig.isPaused !== isPaused && $scope.refreshConfig.interval !== refreshInterval) {
        return;
      }

      store.dispatch(setRefreshConfig($scope.refreshConfig));

      syncAppAndGlobalState();
    });
  };

  getStore().then(store => {
    // clear old UI state
    store.dispatch(setSelectedLayer(null));
    store.dispatch(updateFlyout(FLYOUT_STATE.NONE));

    handleStoreChanges(store);
    unsubscribe = store.subscribe(() => {
      handleStoreChanges(store);
    });

    // sync store with savedMap mapState
    if (savedMap.mapStateJSON) {
      const mapState = JSON.parse(savedMap.mapStateJSON);
      store.dispatch(setGoto({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      }));
    }

    const layerList = getInitialLayers(savedMap.layerListJSON, getDataSources(store.getState()));
    store.dispatch(replaceLayerList(layerList));

    store.dispatch(setRefreshConfig($scope.refreshConfig));
    store.dispatch(setQuery({ query: $scope.query, timeFilters: $scope.time }));

    const root = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
    render(
      <Provider store={store}>
        <GisMap/>
      </Provider>,
      root);
  });

  let prevIndexPatternIds;
  async function updateIndexPatterns(nextIndexPatternIds) {
    const indexPatterns = [];
    const getIndexPatternPromises = nextIndexPatternIds.map(async (indexPatternId) => {
      try {
        const indexPattern = await indexPatternService.get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch(err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);
    // ignore outdated results
    if (prevIndexPatternIds !== nextIndexPatternIds) {
      return;
    }
    $scope.indexPatterns = indexPatterns;
  }

  function handleStoreChanges(store) {
    const state = store.getState();

    // theme changes must triggered in digest cycle because top nav is still angular
    if (isDarkTheme !== getIsDarkTheme(state)) {
      isDarkTheme = getIsDarkTheme(state);
      updateTheme();
    }

    const nextIndexPatternIds = getUniqueIndexPatternIds(state);
    if (nextIndexPatternIds !== prevIndexPatternIds) {
      prevIndexPatternIds = nextIndexPatternIds;
      updateIndexPatterns(nextIndexPatternIds);
    }
  }

  $scope.$on('$destroy', () => {
    if (unsubscribe) {
      unsubscribe();
    }
    const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
    if (node) {
      unmountComponentAtNode(node);
    }
  });

  $scope.getMapTitle = function () {
    return $scope.map.title;
  };
  // k7design breadcrumbs
  // TODO subscribe to store change and change when store updates title
  chrome.breadcrumbs.set([
    { text: 'Map', href: '#' },
    { text: $scope.getMapTitle() }
  ]);
  config.watch('k7design', (val) => $scope.showPluginBreadcrumbs = !val);

  async function doSave(saveOptions) {
    const store = await  getStore();
    savedMap.syncWithStore(store.getState());

    let id;
    try {
      id = await savedMap.save(saveOptions);
    } catch(err) {
      toastNotifications.addDanger({
        title: `Error on saving '${savedMap.title}'`,
        text: err.message,
        'data-test-subj': 'saveMapError',
      });
      return { error: err };
    }

    if (id) {
      toastNotifications.addSuccess({
        title: `Saved '${savedMap.title}'`,
        'data-test-subj': 'saveMapSuccess',
      });

      if (savedMap.id !== $route.current.params.id) {
        $scope.$evalAsync(() => {
          kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
        });
      }
    }
    return { id };
  }

  $scope.showTimepickerInTopNav = false; // used by kbn-top-nav directive to disable timepicker in top nav
  $scope.showDatePicker = true; // used by query-bar directive to enable timepikcer in query bar
  $scope.topNavMenu = [{
    key: 'inspect',
    description: 'Open Inspector',
    testId: 'openInspectorButton',
    run() {
      Inspector.open(inspectorAdapters, {});
    }
  }, {
    key: 'options',
    description: 'Options',
    testId: 'optionsButton',
    run: async (menuItem, navController, anchorElement) => {
      showOptionsPopover(anchorElement);
    }
  }, {
    key: 'save',
    description: 'Save map',
    testId: 'mapSaveButton',
    run: async () => {
      const onSave = ({ newTitle, newCopyOnSave, isTitleDuplicateConfirmed, onTitleDuplicate }) => {
        const currentTitle = savedMap.title;
        savedMap.title = newTitle;
        savedMap.copyOnSave = newCopyOnSave;
        const saveOptions = {
          confirmOverwrite: false,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        };
        return doSave(saveOptions).then(({ id, error }) => {
          // If the save wasn't successful, put the original values back.
          if (!id || error) {
            savedMap.title = currentTitle;
          }
          return { id, error };
        });
      };

      const saveModal = (
        <SavedObjectSaveModal
          onSave={onSave}
          onClose={() => {}}
          title={savedMap.title}
          showCopyOnSave={savedMap.id ? true : false}
          objectType={'gis-map'}
        />);
      showSaveModal(saveModal);
    }
  }];

  function updateTheme() {
    $scope.$evalAsync(() => {
      isDarkTheme ? setDarkTheme() : setLightTheme();
    });
  }

  function setDarkTheme() {
    chrome.removeApplicationClass(['theme-light']);
    chrome.addApplicationClass('theme-dark');
    applyTheme('dark');
  }

  function setLightTheme() {
    chrome.removeApplicationClass(['theme-dark']);
    chrome.addApplicationClass('theme-light');
    applyTheme('light');
  }
});
