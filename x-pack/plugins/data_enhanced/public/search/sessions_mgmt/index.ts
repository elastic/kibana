/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, HttpStart, I18nStart, IUiSettingsClient } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { DataEnhancedStartDependencies } from '../../plugin';
import { SearchSessionsMgmtAPI } from './lib/api';
import { AsyncSearchIntroDocumentation } from './lib/documentation';

export interface IManagementSectionsPluginsSetup {
  management: ManagementSetup;
}

export interface IManagementSectionsPluginsStart {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

export interface AppDependencies {
  plugins: IManagementSectionsPluginsSetup;
  share: SharePluginStart;
  uiSettings: IUiSettingsClient;
  documentation: AsyncSearchIntroDocumentation;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  i18n: I18nStart;
}

export const APP = {
  id: 'background_sessions',
  getI18nName: (): string =>
    i18n.translate('xpack.data.mgmt.searchSessions.appTitle', {
      defaultMessage: 'Background Sessions',
    }),
};

export function registerBackgroundSessionsMgmt(
  coreSetup: CoreSetup<DataEnhancedStartDependencies>,
  services: IManagementSectionsPluginsSetup
) {
  services.management.sections.section.kibana.registerApp({
    id: APP.id,
    title: APP.getI18nName(),
    order: 2,
    mount: async (params) => {
      const { SearchSessionsMgmtApp: MgmtApp } = await import('./application');
      const mgmtApp = new MgmtApp(coreSetup, params, services);
      return mgmtApp.mountManagementSection();
    },
  });
}
