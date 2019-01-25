/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { Provider } from 'react-redux';
import { getStore } from '../store/store';
import { GisMap } from '../components/gis_map';
import {
  setSelectedLayer,
  setTimeFilters,
  setRefreshConfig,
  setGoto,
  replaceLayerList,
  setQuery,
} from '../actions/store_actions';
import { updateFlyout, FLYOUT_STATE } from '../store/ui';
import { getDataSources, getUniqueIndexPatternIds } from '../selectors/map_selectors';
import { Inspector } from 'ui/inspector';
import { inspectorAdapters, indexPatternService } from '../kibana_services';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { toastNotifications } from 'ui/notify';
import { getInitialLayers } from './get_initial_layers';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-gis-root';
const DEFAULT_QUERY_LANGUAGE = 'kuery';

const app = uiModules.get('app/gis', []);

app.controller('GisMapController', ($scope, $route, config, kbnUrl, localStorage, AppState) => {

  const savedMap = $scope.map = $route.current.locals.map;
  let unsubscribe;

  inspectorAdapters.requests.reset();

  const $state = new AppState();
  $scope.$listen($state, 'fetch_with_changes', function (diff) {
    if (diff.includes('query')) {
      $scope.updateQueryAndDispatch($state.query);
    }
  });
  $scope.query = {};
  $scope.indexPatterns = [];
  $scope.updateQueryAndDispatch = function (newQuery) {
    $scope.query = newQuery;
    getStore().then(store => {
      // ignore outdated query
      if ($scope.query !== newQuery) {
        return;
      }

      store.dispatch(setQuery({ query: $scope.query }));

      // update appState
      $state.query = $scope.query;
      $state.save();
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
    let queryFromSavedObject;
    if (savedMap.mapStateJSON) {
      const mapState = JSON.parse(savedMap.mapStateJSON);
      queryFromSavedObject = mapState.query;
      const timeFilters = mapState.timeFilters ? mapState.timeFilters : timefilter.getTime();
      store.dispatch(setTimeFilters(timeFilters));
      store.dispatch(setGoto({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      }));
      if (mapState.refreshConfig) {
        store.dispatch(setRefreshConfig(mapState.refreshConfig));
      }
    }

    const layerList = getInitialLayers(savedMap.layerListJSON, getDataSources(store.getState()));
    store.dispatch(replaceLayerList(layerList));

    // Initialize query, syncing appState and store
    if ($state.query) {
      $scope.updateQueryAndDispatch($state.query);
    } else if (queryFromSavedObject) {
      $scope.updateQueryAndDispatch(queryFromSavedObject);
    } else {
      $scope.updateQueryAndDispatch({
        query: '',
        language: localStorage.get('kibana.userQueryLanguage') || DEFAULT_QUERY_LANGUAGE
      });
    }

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

  $scope.topNavMenu = [{
    key: 'inspect',
    description: 'Open Inspector',
    testId: 'openInspectorButton',
    run() {
      Inspector.open(inspectorAdapters, {});
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
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();
});
