/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n as kbnI18n } from '@kbn/i18n';

import { CoreSetup } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { registerFeature } from './register_feature';

export interface PluginsDependencies {
  data: DataPublicPluginStart;
  management: ManagementSetup;
  home: HomePublicPluginSetup;
}

export class TransformUiPlugin {
  public setup(coreSetup: CoreSetup<PluginsDependencies>, pluginsSetup: PluginsDependencies): void {
    const { management, home } = pluginsSetup;

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    if (esSection !== undefined) {
      esSection.registerApp({
        id: 'transform',
        title: kbnI18n.translate('xpack.transform.appTitle', {
          defaultMessage: 'Transforms',
        }),
        order: 3,
        mount: async (params) => {
          const { mountManagementSection } = await import('./app/mount_management_section');
          return mountManagementSection(coreSetup, params);
        },
      });
    }
    registerFeature(home);
  }

  public start() {}
  public stop() {}
}
