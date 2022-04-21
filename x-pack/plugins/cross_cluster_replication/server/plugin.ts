/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { CoreSetup, CoreStart, Plugin, Logger, PluginInitializerContext } from 'src/core/server';
import { IScopedClusterClient } from 'kibana/server';

import { Index } from '../../index_management/server';
import { PLUGIN } from '../common/constants';
import { SetupDependencies, StartDependencies } from './types';
import { registerApiRoutes } from './routes';
import { CrossClusterReplicationConfig } from './config';
import { License, handleEsError } from './shared_imports';

const ccrDataEnricher = async (indicesList: Index[], client: IScopedClusterClient) => {
  if (!indicesList?.length) {
    return indicesList;
  }

  try {
    const { follower_indices: followerIndices } = await client.asCurrentUser.ccr.followInfo({
      index: '_all',
    });

    return indicesList.map((index) => {
      const isFollowerIndex = !!followerIndices.find(
        (followerIndex: { follower_index: string }) => {
          return followerIndex.follower_index === index.name;
        }
      );
      return {
        ...index,
        isFollowerIndex,
      };
    });
  } catch (e) {
    return indicesList;
  }
};

export class CrossClusterReplicationServerPlugin implements Plugin<void, void, any, any> {
  private readonly config$: Observable<CrossClusterReplicationConfig>;
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config$ = initializerContext.config.create();
    this.license = new License();
  }

  setup(
    { http, getStartServices }: CoreSetup,
    { features, licensing, indexManagement, remoteClusters }: SetupDependencies
  ) {
    firstValueFrom(this.config$).then((config) => {
      // remoteClusters.isUiEnabled is driven by the xpack.remote_clusters.ui.enabled setting.
      // The CCR UI depends upon the Remote Clusters UI (e.g. by cross-linking to it), so if
      // the Remote Clusters UI is disabled we can't show the CCR UI.
      const isCcrUiEnabled = config.ui.enabled && remoteClusters.isUiEnabled;

      // If the UI isn't enabled, then we don't want to expose any CCR concepts in the UI, including
      // "follower" badges for follower indices.
      if (isCcrUiEnabled) {
        if (indexManagement.indexDataEnricher) {
          indexManagement.indexDataEnricher.add(ccrDataEnricher);
        }
      }
    });

    this.license.setup({
      pluginName: PLUGIN.TITLE,
      logger: this.logger,
    });

    features.registerElasticsearchFeature({
      id: 'cross_cluster_replication',
      management: {
        data: ['cross_cluster_replication'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage', 'manage_ccr'],
          ui: [],
        },
      ],
    });

    registerApiRoutes({
      router: http.createRouter(),
      license: this.license,
      lib: {
        handleEsError,
      },
    });
  }

  start(core: CoreStart, { licensing }: StartDependencies) {
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.minimumLicenseType,
      licensing,
    });
  }

  stop() {}
}
