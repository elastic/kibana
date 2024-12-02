/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { PLUGIN } from '../common/constants/plugin';
import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { IndexDataEnricher } from './services';
import { handleEsError } from './shared_imports';
import { IndexManagementConfig } from './config';

export interface IndexManagementPluginSetup {
  indexDataEnricher: {
    add: IndexDataEnricher['add'];
  };
}

export class IndexMgmtServerPlugin implements Plugin<IndexManagementPluginSetup, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly indexDataEnricher: IndexDataEnricher;
  private readonly config: IndexManagementConfig;

  constructor(initContext: PluginInitializerContext) {
    this.apiRoutes = new ApiRoutes();
    this.indexDataEnricher = new IndexDataEnricher();
    this.config = initContext.config.get();
  }

  setup(
    { http, getStartServices }: CoreSetup,
    { features, security }: Dependencies
  ): IndexManagementPluginSetup {
    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      management: {
        data: ['index_management'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage_enrich'],
          ui: ['manageEnrich'],
        },
        {
          // manage_index_templates is also required, but we will disable specific parts of the
          // UI if this privilege is missing.
          requiredClusterPrivileges: ['monitor'],
          ui: [],
        },
      ],
    });

    this.apiRoutes.setup({
      router: http.createRouter(),
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
        isLegacyTemplatesEnabled: this.config.enableLegacyTemplates,
        isIndexStatsEnabled: this.config.enableIndexStats ?? true,
        isSizeAndDocCountEnabled: this.config.enableSizeAndDocCount ?? false,
        enableProjectLevelRetentionChecks: this.config.enableProjectLevelRetentionChecks ?? false,
        isDataStreamStatsEnabled: this.config.enableDataStreamStats,
        enableMappingsSourceFieldSection: this.config.enableMappingsSourceFieldSection,
        enableTogglingDataRetention: this.config.enableTogglingDataRetention,
      },
      indexDataEnricher: this.indexDataEnricher,
      lib: {
        handleEsError,
      },
    });

    return {
      indexDataEnricher: {
        add: this.indexDataEnricher.add.bind(this.indexDataEnricher),
      },
    };
  }

  start() {}

  stop() {}
}
