/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { trimStart } from 'lodash';
import { CoreSetup } from 'kibana/public';
import { KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';
import {
  createDashboardEditUrl,
  DashboardConstants,
} from '../../../../src/plugins/dashboard/public';
import { AppNavLinkStatus } from '../../../../src/core/public';

function defaultUrl(defaultAppId: string) {
  const isDashboardId = defaultAppId.startsWith(dashboardAppIdPrefix());
  return isDashboardId ? `/${defaultAppId}` : DashboardConstants.LANDING_PAGE_PATH;
}

function dashboardAppIdPrefix() {
  return trimStart(createDashboardEditUrl(''), '/');
}

function migratePath(currentHash: string, kibanaLegacy: KibanaLegacyStart) {
  if (currentHash === '' || currentHash === '#' || currentHash === '#/') {
    return `#${defaultUrl(kibanaLegacy.config.defaultAppId || '')}`;
  }
  if (!currentHash.startsWith('#/dashboard')) {
    return currentHash;
  }

  const forwards = kibanaLegacy.getForwards();

  if (currentHash.startsWith('#/dashboards')) {
    const { rewritePath: migrateListingPath } = forwards.find(
      ({ legacyAppId }) => legacyAppId === 'dashboards'
    )!;
    return migrateListingPath(currentHash);
  }

  const { rewritePath: migrateDetailPath } = forwards.find(
    ({ legacyAppId }) => legacyAppId === 'dashboard'
  )!;
  return migrateDetailPath(currentHash);
}

export const plugin = () => ({
  setup(core: CoreSetup<{ kibanaLegacy: KibanaLegacyStart }>) {
    core.application.register({
      id: 'dashboard_mode',
      title: 'Dashboard mode',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async () => {
        const [coreStart, { kibanaLegacy }] = await core.getStartServices();
        kibanaLegacy.dashboardConfig.turnHideWriteControlsOn();
        coreStart.chrome.navLinks.showOnly('dashboards');
        setTimeout(() => {
          coreStart.application.navigateToApp('dashboards', {
            path: migratePath(window.location.hash, kibanaLegacy),
          });
        }, 0);
        return () => {};
      },
    });
  },
  start() {},
});
