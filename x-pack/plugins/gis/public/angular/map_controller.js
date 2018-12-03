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
import { timefilter } from 'ui/timefilter';
import { Provider } from 'react-redux';
import { getStore } from '../store/store';
import { GisMap } from '../components/gis_map';
import { setTimeFilters, mapExtentChanged, replaceLayerList } from '../actions/store_actions';
import { getIsDarkTheme } from '../store/ui';
import { Inspector } from 'ui/inspector';
import { inspectorAdapters } from '../kibana_services';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { showOptionsPopover } from '../components/top_nav/show_options_popover';
import { toastNotifications } from 'ui/notify';
import { getMapReady, getTimeFilters } from "../selectors/map_selectors";

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-gis-root';

const app = uiModules.get('app/gis', []);

app.controller('GisMapController', ($scope, $route, config, kbnUrl) => {

  let isLayersListInitializedFromSavedObject = false;
  const savedMap = $scope.map = $route.current.locals.map;
  let isDarkTheme;
  let unsubscribe;

  getStore().then(store => {
    handleStoreChanges(store);
    unsubscribe = store.subscribe(() => {
      handleStoreChanges(store);
    });

    // sync store with savedMap mapState
    // layerList is synced after map has initialized and extent is known.
    if (savedMap.mapStateJSON) {
      const mapState = JSON.parse(savedMap.mapStateJSON);
      const timeFilters = mapState.timeFilters ? mapState.timeFilters : timefilter.getTime();
      store.dispatch(setTimeFilters(timeFilters));
      store.dispatch(mapExtentChanged({
        zoom: mapState.zoom,
        center: mapState.center,
      }));
    }

    const root = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
    render(
      <Provider store={store}>
        <GisMap/>
      </Provider>,
      root);
  });

  function handleStoreChanges(store) {
    if (isDarkTheme !== getIsDarkTheme(store.getState())) {
      isDarkTheme = getIsDarkTheme(store.getState());
      updateTheme();
    }

    const storeTime = getTimeFilters(store.getState());
    const kbnTime = timefilter.getTime();
    if (storeTime && (storeTime.to !== kbnTime.to || storeTime.from !== kbnTime.from)) {
      timefilter.setTime(storeTime);
    }

    // Part of initial syncing of store from saved object
    // Delayed until after map is ready so map extent is known
    if (!isLayersListInitializedFromSavedObject && getMapReady(store.getState())) {
      isLayersListInitializedFromSavedObject = true;
      const layerList = savedMap.layerListJSON ? JSON.parse(savedMap.layerListJSON) : [];
      store.dispatch(replaceLayerList(layerList));
    }
  }

  timefilter.on('timeUpdate', dispatchTimeUpdate);

  $scope.$on('$destroy', () => {
    if (unsubscribe) {
      unsubscribe();
    }
    timefilter.off('timeUpdate', dispatchTimeUpdate);
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
        kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
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
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  async function dispatchTimeUpdate() {
    const timeFilters = timefilter.getTime();
    const store = await getStore();
    store.dispatch(setTimeFilters(timeFilters));
  }

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
