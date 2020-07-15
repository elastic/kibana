/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from 'src/core/public';

import { PLUGIN_ID } from '../common/constants';
import { uiMetricService, apiService } from './application/services';
import { Dependencies } from './types';

export class IngestPipelinesPlugin implements Plugin {
  public setup(coreSetup: CoreSetup, plugins: Dependencies): void {
    const { management, usageCollection } = plugins;
    const { http } = coreSetup;

    // Initialize services
    uiMetricService.setup(usageCollection);
    apiService.setup(http, uiMetricService);

    management.sections.section.ingest.registerApp({
      id: PLUGIN_ID,
      order: 1,
      title: i18n.translate('xpack.ingestPipelines.appTitle', {
        defaultMessage: 'Ingest Node Pipelines',
      }),
      mount: async (params) => {
        const { mountManagementSection } = await import('./application/mount_management_section');

        return await mountManagementSection(coreSetup, params);
      },
    });
  }

  public start() {}

  public stop() {}
}
