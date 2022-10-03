/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Provider, useStore } from 'react-redux';
import { AppMountParameters, Capabilities, CoreStart } from '@kbn/core/public';
import { useHistory, useLocation } from 'react-router-dom';
import { Start as InspectorPublicPluginStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { datasourceSelector, hasFieldsSelector } from '../../state_management';
import { GraphSavePolicy, GraphWorkspaceSavedObject, Workspace } from '../../types';
import { AsObservable, Settings, SettingsWorkspaceProps } from '../settings';
import { asSyncedObservable } from '../../helpers/as_observable';
import { useInspector } from '../../helpers/use_inspector';

interface WorkspaceTopNavMenuProps {
  workspace: Workspace | undefined;
  confirmWipeWorkspace: (
    onConfirm: () => void,
    text?: string,
    options?: { confirmButtonText: string; title: string }
  ) => void;
  savedWorkspace: GraphWorkspaceSavedObject;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  graphSavePolicy: GraphSavePolicy;
  navigation: NavigationStart;
  capabilities: Capabilities;
  inspect: InspectorPublicPluginStart;
  coreStart: CoreStart;
  canEditDrillDownUrls: boolean;
  isInitialized: boolean;
  requestAdapter: RequestAdapter;
}

export const WorkspaceTopNavMenu = (props: WorkspaceTopNavMenuProps) => {
  const store = useStore();
  const location = useLocation();
  const history = useHistory();
  const allSavingDisabled = props.graphSavePolicy === 'none';
  const isInspectDisabled = !props.workspace?.lastRequest || !props.workspace.lastRequest;

  const { onOpenInspector } = useInspector({
    inspect: props.inspect,
    requestAdapter: props.requestAdapter,
  });

  // ===== Menubar configuration =========
  const { TopNavMenu } = props.navigation.ui;
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
    disableButton() {
      return !props.isInitialized;
    },
    run() {
      props.confirmWipeWorkspace(() => {
        if (location.pathname === '/workspace/') {
          history.go(0);
        } else {
          history.push('/workspace/');
        }
      });
    },
    testId: 'graphNewButton',
  });

  // if saving is disabled using uiCapabilities, we don't want to render the save
  // button so it's consistent with all of the other applications
  if (props.capabilities.graph.save) {
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
        return allSavingDisabled || !hasFieldsSelector(store.getState());
      },
      run: () => {
        store.dispatch({ type: 'x-pack/graph/SAVE_WORKSPACE', payload: props.savedWorkspace });
      },
      testId: 'graphSaveButton',
    });
  }
  topNavMenu.push({
    key: 'inspect',
    disableButton() {
      return isInspectDisabled;
    },
    label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
      defaultMessage: 'Inspect',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.inspectAriaLabel', {
      defaultMessage: 'Inspect',
    }),
    run: () => {
      onOpenInspector();
    },
    tooltip: () => {
      if (isInspectDisabled) {
        return i18n.translate('xpack.graph.topNavMenu.inspectButton.disabledTooltip', {
          defaultMessage: 'Perform a search or expand a node to enable Inspect',
        });
      }
    },
    testId: 'graphInspectButton',
  });

  topNavMenu.push({
    key: 'settings',
    disableButton() {
      return datasourceSelector(store.getState()).current.type === 'none';
    },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    run: () => {
      // At this point workspace should be initialized,
      // since settings button will be disabled only if workspace was set
      const workspace = props.workspace as Workspace;

      const settingsObservable = asSyncedObservable(() => ({
        blocklistedNodes: workspace.blocklistedNodes,
        unblockNode: workspace.unblockNode,
        unblockAll: workspace.unblockAll,
        canEditDrillDownUrls: props.canEditDrillDownUrls,
      })) as unknown as AsObservable<SettingsWorkspaceProps>['observable'];

      props.coreStart.overlays.openFlyout(
        toMountPoint(
          wrapWithTheme(
            <Provider store={store}>
              <Settings observable={settingsObservable} />
            </Provider>,
            props.coreStart.theme.theme$
          )
        ),
        {
          size: 'm',
          closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', {
            defaultMessage: 'Close',
          }),
          'data-test-subj': 'graphSettingsFlyout',
          ownFocus: true,
          className: 'gphSettingsFlyout',
          maxWidth: 520,
          'aria-label': i18n.translate('xpack.graph.settings.ariaLabel', {
            defaultMessage: 'Settings',
          }),
        }
      );
    },
    testId: 'graphSettingsButton',
  });

  return (
    <TopNavMenu
      appName="workspacesTopNav"
      config={topNavMenu}
      setMenuMountPoint={props.setHeaderActionMenu}
    />
  );
};
