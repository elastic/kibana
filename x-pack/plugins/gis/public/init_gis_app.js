/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  uiModules
} from 'ui/modules';
import './shared/services/gis_workspace_provider';
import chrome from 'ui/chrome';
import { applyTheme } from 'ui/theme';
import 'ui/autoload/all';
import {
  timefilter
} from 'ui/timefilter';
import { getStore } from './store/store';
import { setTimeFilters } from './actions/store_actions';
import { getIsDarkTheme } from './store/ui';
import { Inspector } from 'ui/inspector';
import { inspectorAdapters } from './kibana_services';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { getWorkspaceSaveFunction } from './shared/services/save_map_state';
import { showOptionsPopover } from './components/top_nav/show_options_popover';

// hack to wait for angular template to be ready
const waitForAngularReady = new Promise(resolve => {
  const checkInterval = setInterval(() => {
    const hasElm = !!document.querySelector('#gis-top-nav');
    if (hasElm) {
      clearInterval(checkInterval);
      resolve();
    }
  }, 10);
});

export function initGisApp(resolve) {
  // default the timepicker to the last 24 hours
  timefilter.setTime({
    from: 'now-24h',
    to: 'now',
    mode: 'quick'
  });

  uiModules
    .get('app/gis', [])
    .controller('TimePickerController', ($scope, gisWorkspace) => {

      let isDarkTheme;
      let unsubscribe;
      getStore().then(store => {
        handleStoreChanges(store);
        unsubscribe = store.subscribe(() => {
          handleStoreChanges(store);
        });
      });

      timefilter.on('timeUpdate', dispatchTimeUpdate);

      $scope.$on('$destroy', () => {
        if (unsubscribe) {
          unsubscribe();
        }
        timefilter.off('timeUpdate', dispatchTimeUpdate);
      });

      $scope.topNavMenu = [{
        key: 'inspect',
        description: 'Open Inspector',
        testId: 'openInspectorButton',
        run() {
          Inspector.open(inspectorAdapters, {
            title: 'Layer requests'
          });
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
        description: 'Save Visualization',
        testId: 'visualizeSaveButton',
        run: async () => {
          const workspaceSave = await getWorkspaceSaveFunction(gisWorkspace);
          const saveModal = (
            <SavedObjectSaveModal
              onSave={workspaceSave}
              onClose={() => {}}
              title={'Save map settings'}
              showCopyOnSave={false}
              objectType={gisWorkspace.getType()}
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

      function handleStoreChanges(store) {
        if (isDarkTheme !== getIsDarkTheme(store.getState())) {
          isDarkTheme = getIsDarkTheme(store.getState());
          updateTheme();
        }
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

      Promise.all([waitForAngularReady]).then(resolve());
    });
}
