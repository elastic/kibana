/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  ChromeStart,
  CoreStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  ToastsStart,
  OverlayStart,
  AppMountParameters,
  IUiSettingsClient,
  Capabilities,
  ScopedHistory,
} from 'kibana/public';
import ReactDOM from 'react-dom';
import { DataPlugin, IndexPatternsContract } from '../../../../src/plugins/data/public';
import { LicensingPluginStart } from '../../licensing/public';
import { checkLicense } from '../common/check_license';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../src/plugins/navigation/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';

import './index.scss';
import { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public';
import { GraphSavePolicy } from './types';
import { graphRouter } from './router';
import { SpacesApi } from '../../spaces/public';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface GraphDependencies {
  pluginInitializerContext: PluginInitializerContext;
  core: CoreStart;
  coreStart: CoreStart;
  element: HTMLElement;
  appBasePath: string;
  capabilities: Capabilities;
  navigation: NavigationStart;
  licensing: LicensingPluginStart;
  chrome: ChromeStart;
  toastNotifications: ToastsStart;
  indexPatterns: IndexPatternsContract;
  data: ReturnType<DataPlugin['start']>;
  savedObjectsClient: SavedObjectsClientContract;
  addBasePath: (url: string) => string;
  getBasePath: () => string;
  storage: Storage;
  canEditDrillDownUrls: boolean;
  graphSavePolicy: GraphSavePolicy;
  overlays: OverlayStart;
  savedObjects: SavedObjectsStart;
  kibanaLegacy: KibanaLegacyStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  uiSettings: IUiSettingsClient;
  history: ScopedHistory<unknown>;
  spaces?: SpacesApi;
}

export type GraphServices = Omit<GraphDependencies, 'kibanaLegacy' | 'element' | 'history'>;

export const renderApp = ({ history, kibanaLegacy, element, ...deps }: GraphDependencies) => {
  const { chrome, capabilities } = deps;
  kibanaLegacy.loadFontAwesome();

  if (!capabilities.graph.save) {
    chrome.setBadge({
      text: i18n.translate('xpack.graph.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('xpack.graph.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save Graph workspaces',
      }),
      iconType: 'glasses',
    });
  }

  const licenseSubscription = deps.licensing.license$.subscribe((license) => {
    const info = checkLicense(license);
    const licenseAllowsToShowThisPage = info.showAppLink && info.enableAppLink;

    if (!licenseAllowsToShowThisPage) {
      if (info.message) {
        deps.core.notifications.toasts.addDanger(info.message);
      }

      // This has to happen in the next tick because otherwise the original navigation
      // bringing us to the graph app in the first place
      // never completes and the browser enters are redirect loop
      setTimeout(() => {
        deps.core.application.navigateToApp('home');
      }, 0);
    }
  });

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  const app = graphRouter(deps);
  ReactDOM.render(app, element);
  element.setAttribute('class', 'gphAppWrapper');

  return () => {
    licenseSubscription.unsubscribe();
    unlistenParentHistory();
    ReactDOM.unmountComponentAtNode(element);
  };
};
