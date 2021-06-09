/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
  LegacyAPICaller,
} from 'src/core/server';

import { Index } from '../../index_management/server';
import { PLUGIN } from '../common/constants';
import { SetupDependencies, StartDependencies } from './types';
import { registerApiRoutes } from './routes';
import { CrossClusterReplicationConfig } from './config';
import { License, handleEsError } from './shared_imports';

// TODO replace deprecated ES client after Index Management is updated
const ccrDataEnricher = async (indicesList: Index[], callWithRequest: LegacyAPICaller) => {
  if (!indicesList?.length) {
    return indicesList;
  }
  const params = {
    path: '/_all/_ccr/info',
    method: 'GET',
  };
  try {
    const { follower_indices: followerIndices } = await callWithRequest(
      'transport.request',
      params
    );
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
    this.config$
      .pipe(first())
      .toPromise()
      .then((config) => {
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
