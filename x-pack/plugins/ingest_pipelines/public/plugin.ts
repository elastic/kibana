/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from 'src/core/public';

import { PLUGIN_ID } from '../common/constants';
import { uiMetricService, apiService } from './application/services';
import { SetupDependencies, StartDependencies } from './types';
import { registerUrlGenerator } from './url_generator';

export class IngestPipelinesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(coreSetup: CoreSetup<StartDependencies>, plugins: SetupDependencies): void {
    const { management, usageCollection, share } = plugins;
    const { http, getStartServices } = coreSetup;

    // Initialize services
    uiMetricService.setup(usageCollection);
    apiService.setup(http, uiMetricService);

    const pluginName = i18n.translate('xpack.ingestPipelines.appTitle', {
      defaultMessage: 'Ingest Node Pipelines',
    });

    management.sections.section.ingest.registerApp({
      id: PLUGIN_ID,
      order: 1,
      title: pluginName,
      mount: async (params) => {
        const [coreStart] = await getStartServices();

        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(pluginName);

        const { mountManagementSection } = await import('./application/mount_management_section');
        const unmountAppCallback = await mountManagementSection(coreSetup, params);

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });

    registerUrlGenerator(coreSetup, management, share);
  }

  public start() {}

  public stop() {}
}
