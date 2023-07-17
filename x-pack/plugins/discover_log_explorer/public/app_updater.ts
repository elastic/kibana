/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { App, AppDeepLink, AppNavLinkStatus, AppUpdater } from '@kbn/core-application-browser';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';
import { DiscoverLogExplorerConfig } from '../common/plugin_config';

const getLogExplorerDeepLink = ({ isVisible }: { isVisible: boolean }) => ({
  id: LOG_EXPLORER_PROFILE_ID,
  title: i18n.translate('xpack.discoverLogExplorer.deepLink', {
    defaultMessage: 'Logs Explorer',
  }),
  path: `#/p/log-explorer`,
  category: DEFAULT_APP_CATEGORIES.observability,
  euiIconType: 'logoObservability',
  navLinkStatus: isVisible ? AppNavLinkStatus.visible : AppNavLinkStatus.default,
});

export const createAppUpdater = (config: DiscoverLogExplorerConfig) => {
  return new BehaviorSubject<AppUpdater>((app) => {
    if (app.id === 'discover') {
      return {
        deepLinks: appendDeepLinks(app, [
          getLogExplorerDeepLink({ isVisible: config.featureFlags.deepLinkVisible }),
        ]),
      };
    }
  });
};

const appendDeepLinks = (app: App, deepLinks: AppDeepLink[]) => {
  return deepLinks.reduce<AppDeepLink[]>((links, deepLink) => {
    const shouldAddLink = !hasDeepLink(links, deepLink);
    if (shouldAddLink) {
      return [...links, deepLink];
    }
    return links;
  }, app.deepLinks ?? []);
};

const hasDeepLink = (deepLinks: AppDeepLink[], deepLink: AppDeepLink) =>
  Boolean(deepLinks?.find((link) => link.id === deepLink.id));
