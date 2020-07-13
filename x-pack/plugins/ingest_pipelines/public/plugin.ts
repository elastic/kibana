/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin } from 'src/core/public';

import { ManagementSectionId } from '../../../../src/plugins/management/public';
import { PLUGIN_ID, PLUGIN_I18N_NAME } from '../common/constants';
import { uiMetricService, apiService } from './application/services';
import { Dependencies } from './types';

export class IngestPipelinesPlugin implements Plugin {
  public setup(coreSetup: CoreSetup, plugins: Dependencies): void {
    const { management, usageCollection } = plugins;
    const { http } = coreSetup;

    // Initialize services
    uiMetricService.setup(usageCollection);
    apiService.setup(http, uiMetricService);

    management.sections.getSection(ManagementSectionId.Ingest).registerApp({
      id: PLUGIN_ID,
      order: 1,
      title: PLUGIN_I18N_NAME,
      mount: async (params) => {
        const { mountManagementSection } = await import('./application/mount_management_section');

        return await mountManagementSection(coreSetup, params);
      },
    });
  }

  public start() {}

  public stop() {}
}
