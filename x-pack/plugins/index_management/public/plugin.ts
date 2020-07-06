/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup } from '../../../../src/core/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup, ManagementSectionId } from '../../../../src/plugins/management/public';

import { IngestManagerSetup } from '../../ingest_manager/public';
import { UIM_APP_NAME, PLUGIN } from '../common/constants';

import { httpService } from './application/services/http';
import { notificationService } from './application/services/notification';
import { UiMetricService } from './application/services/ui_metric';

import { setExtensionsService } from './application/store/selectors';
import { setUiMetricService } from './application/services/api';

import { IndexMgmtMetricsType } from './types';
import { ExtensionsService, ExtensionsSetup } from './services';

export interface IndexManagementPluginSetup {
  extensionsService: ExtensionsSetup;
}

interface PluginsDependencies {
  ingestManager?: IngestManagerSetup;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export class IndexMgmtUIPlugin {
  private uiMetricService = new UiMetricService<IndexMgmtMetricsType>(UIM_APP_NAME);
  private extensionsService = new ExtensionsService();

  constructor() {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
    setUiMetricService(this.uiMetricService);
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies): IndexManagementPluginSetup {
    const { http, notifications } = coreSetup;
    const { ingestManager, usageCollection, management } = plugins;

    httpService.setup(http);
    notificationService.setup(notifications);
    this.uiMetricService.setup(usageCollection);

    management.sections.getSection(ManagementSectionId.Data).registerApp({
      id: PLUGIN.id,
      title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
      order: 0,
      mount: async (params) => {
        const { mountManagementSection } = await import('./application/mount_management_section');
        const services = {
          httpService,
          notificationService,
          uiMetricService: this.uiMetricService,
          extensionsService: this.extensionsService,
        };
        return mountManagementSection(coreSetup, usageCollection, services, params, ingestManager);
      },
    });

    return {
      extensionsService: this.extensionsService.setup(),
    };
  }

  public start() {}
  public stop() {}
}
