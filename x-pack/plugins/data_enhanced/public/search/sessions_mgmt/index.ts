/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart } from '../../../../../../src/core/public/types';
import type { HttpStart } from '../../../../../../src/core/public/http/types';
import type { I18nStart } from '../../../../../../src/core/public/i18n/i18n_service';
import type { IUiSettingsClient } from '../../../../../../src/core/public/ui_settings/types';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from '../../../../../../src/plugins/data/public/search/session/constants';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../../src/plugins/data/public/types';
import type { ManagementSetup } from '../../../../../../src/plugins/management/public/types';
import type { SharePluginStart } from '../../../../../../src/plugins/share/public/plugin';
import type { ConfigSchema } from '../../../config';
import type { DataEnhancedStartDependencies } from '../../plugin';
import { SearchSessionsMgmtAPI } from './lib/api';
import { AsyncSearchIntroDocumentation } from './lib/documentation';

export interface IManagementSectionsPluginsSetup {
  data: DataPublicPluginSetup;
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
  core: CoreStart; // for RedirectAppLinks
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  i18n: I18nStart;
  config: SessionsConfigSchema;
  kibanaVersion: string;
}

export const APP = {
  id: SEARCH_SESSIONS_MANAGEMENT_ID,
  getI18nName: (): string =>
    i18n.translate('xpack.data.mgmt.searchSessions.appTitle', {
      defaultMessage: 'Search Sessions',
    }),
};

export type SessionsConfigSchema = ConfigSchema['search']['sessions'];

export function registerSearchSessionsMgmt(
  coreSetup: CoreSetup<DataEnhancedStartDependencies>,
  config: SessionsConfigSchema,
  kibanaVersion: string,
  services: IManagementSectionsPluginsSetup
) {
  services.management.sections.section.kibana.registerApp({
    id: APP.id,
    title: APP.getI18nName(),
    order: 1.75,
    mount: async (params) => {
      const { SearchSessionsMgmtApp: MgmtApp } = await import('./application');
      const mgmtApp = new MgmtApp(coreSetup, config, kibanaVersion, params, services);
      return mgmtApp.mountManagementSection();
    },
  });
}
