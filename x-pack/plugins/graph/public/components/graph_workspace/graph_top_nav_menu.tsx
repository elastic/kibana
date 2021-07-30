/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { GraphDependencies } from '../../application';
import { datasourceSelector, GraphStore, hasFieldsSelector } from '../../state_management';
import { GraphWorkspaceSavedObject, Workspace } from '../../types';

export interface MenuOptions {
  showSettings: boolean;
  showInspect: boolean;
}

interface GraphTopNavMenuProps {
  deps: GraphDependencies;
  store: GraphStore;
  location: angular.ILocationService;
  savedWorkspace: GraphWorkspaceSavedObject;
  workspace: Workspace | undefined;
  onSetMenus: React.Dispatch<React.SetStateAction<MenuOptions>>;
  canWipeWorkspace: (
    onConfirm: () => void,
    text?: string,
    options?: { confirmButtonText: string; title: string }
  ) => void;
}

export const GraphTopNavMenu = (props: GraphTopNavMenuProps) => {
  // register things for legacy angular UI
  const allSavingDisabled = props.deps.graphSavePolicy === 'none';

  // ===== Menubar configuration =========
  const { TopNavMenu } = props.deps.navigation.ui;
  const topNavMenu = [];
  topNavMenu.push({
    key: 'new',
    label: i18n.translate('xpack.graph.topNavMenu.newWorkspaceLabel', {
      defaultMessage: 'New',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.newWorkspaceAriaLabel', {
      defaultMessage: 'New Workspace',
    }),
    tooltip: i18n.translate('xpack.graph.topNavMenu.newWorkspaceTooltip', {
      defaultMessage: 'Create a new workspace',
    }),
    run() {
      props.canWipeWorkspace(function () {
        if (props.location.url() === '/workspace/') {
          location.reload();
        } else {
          props.location.url('/workspace/');
        }
      });
    },
    testId: 'graphNewButton',
  });

  // if saving is disabled using uiCapabilities, we don't want to render the save
  // button so it's consistent with all of the other applications
  if (props.deps.capabilities.save) {
    // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality

    topNavMenu.push({
      key: 'save',
      label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
        defaultMessage: 'Save workspace',
      }),
      tooltip: () => {
        if (allSavingDisabled) {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
            defaultMessage:
              'No changes to saved workspaces are permitted by the current save policy',
          });
        } else {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
            defaultMessage: 'Save this workspace',
          });
        }
      },
      disableButton() {
        return allSavingDisabled || !hasFieldsSelector(props.store.getState());
      },
      run: () => {
        props.store.dispatch({
          type: 'x-pack/graph/SAVE_WORKSPACE',
          payload: props.savedWorkspace,
        });
      },
      testId: 'graphSaveButton',
    });
  }
  topNavMenu.push({
    key: 'inspect',
    disableButton() {
      return props.workspace === null;
    },
    label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
      defaultMessage: 'Inspect',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.inspectAriaLabel', {
      defaultMessage: 'Inspect',
    }),
    run: () => {
      props.onSetMenus((prevMenus) => ({
        showSettings: false,
        showInspect: !prevMenus.showInspect,
      }));
    },
  });

  topNavMenu.push({
    key: 'settings',
    disableButton() {
      return datasourceSelector(props.store.getState()).current.type === 'none';
    },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    run: () => {
      //   const settingsObservable = asAngularSyncedObservable(
      //     () => ({
      //       blocklistedNodes: $scope.workspace ? [...$scope.workspace.blocklistedNodes] : undefined,
      //       unblocklistNode: $scope.workspace ? $scope.workspace.unblocklist : undefined,
      //       canEditDrillDownUrls,
      //     }),
      //     $scope.$digest.bind($scope)
      //   );
      //   props.deps.coreStart.overlays.openFlyout(
      //     toMountPoint(
      //       <Provider store={props.store}>
      //         <Settings observable={settingsObservable} />
      //       </Provider>
      //     ),
      //     {
      //       size: 'm',
      //       closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', {
      //         defaultMessage: 'Close',
      //       }),
      //       'data-test-subj': 'graphSettingsFlyout',
      //       ownFocus: true,
      //       className: 'gphSettingsFlyout',
      //       maxWidth: 520,
      //     }
      //   );
    },
  });

  return (
    <TopNavMenu
      appName="workspacesTopNav"
      config={topNavMenu}
      setMenuMountPoint={props.deps.setHeaderActionMenu}
    />
  );
};
