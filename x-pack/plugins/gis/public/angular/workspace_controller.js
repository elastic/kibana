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
import { GISApp } from '../components/gis_app';
import { setTimeFilters } from '../actions/store_actions';
import { getIsDarkTheme } from '../store/ui';
import { Inspector } from 'ui/inspector';
import { inspectorAdapters } from '../kibana_services';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { showOptionsPopover } from '../components/top_nav/show_options_popover';
import { toastNotifications } from 'ui/notify';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-gis-root';

const app = uiModules.get('app/gis', []);

app.controller('GisWorkspaceController', ($scope, $route, config, breadcrumbState, kbnUrl) => {

  const savedWorkspace = $scope.workspace = $route.current.locals.workspace;
  let isDarkTheme;
  let unsubscribe;

  getStore().then(store => {
    handleStoreChanges(store);
    unsubscribe = store.subscribe(() => {
      handleStoreChanges(store);
    });

    // TODO dispatch actions to sync store with savedWorkspace

    const root = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
    render(
      <Provider store={store}>
        <GISApp/>
      </Provider>,
      root);
  });

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

  $scope.getWorkspaceTitle = function () {
    return $scope.workspace.title;
  };
  // k7design breadcrumbs
  // TODO subscribe to store change and change when store updates title
  breadcrumbState.set([
    { text: 'Workspace', href: '#' },
    { text: $scope.getWorkspaceTitle() }
  ]);
  config.watch('k7design', (val) => $scope.showPluginBreadcrumbs = !val);

  function doSave(saveOptions) {
    return savedWorkspace.save(saveOptions)
      .then(function (id) {
        if (id) {
          toastNotifications.addSuccess({
            title: `Saved '${savedWorkspace.title}'`,
            'data-test-subj': 'saveWorkspaceSuccess',
          });

          if (savedWorkspace.id !== $route.current.params.id) {
            kbnUrl.change(`workspace/{{id}}`, { id: savedWorkspace.id });
          }
        }
        return { id };
      }, (err) => {
        toastNotifications.addDanger({
          title: `Error on saving '${savedWorkspace.title}'`,
          text: err.message,
          'data-test-subj': 'saveWorkspaceError',
        });
        return { error: err };
      });
  }

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
    description: 'Save workspace',
    testId: 'workspaceSaveButton',
    run: async () => {
      const onSave = ({ newTitle, newCopyOnSave, isTitleDuplicateConfirmed, onTitleDuplicate }) => {
        const currentTitle = savedWorkspace.title;
        savedWorkspace.title = newTitle;
        savedWorkspace.copyOnSave = newCopyOnSave;
        const saveOptions = {
          confirmOverwrite: false,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        };
        return doSave(saveOptions).then(({ id, error }) => {
          // If the save wasn't successful, put the original values back.
          if (!id || error) {
            savedWorkspace.title = currentTitle;
          }
          return { id, error };
        });
      };

      const saveModal = (
        <SavedObjectSaveModal
          onSave={onSave}
          onClose={() => {}}
          title={savedWorkspace.title}
          showCopyOnSave={savedWorkspace.id ? true : false}
          objectType={'gis-workspace'}
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

    // TODO sync savedWorkspace with store
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
