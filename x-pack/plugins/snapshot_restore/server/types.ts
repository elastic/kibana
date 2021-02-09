/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LegacyScopedClusterClient,
  ILegacyScopedClusterClient,
  IRouter,
  RequestHandlerContext,
} from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { CloudSetup } from '../../cloud/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { License } from './services';
import { wrapEsError } from './lib';
import { isEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  cloud?: CloudSetup;
}

export interface RouteDependencies {
  router: SnapshotRestoreRouter;
  license: License;
  config: {
    isSlmEnabled: boolean;
    isSecurityEnabled: () => boolean;
    isCloudEnabled: boolean;
  };
  lib: {
    isEsError: typeof isEsError;
    wrapEsError: typeof wrapEsError;
  };
}

/**
 * An object representing a resolved index, data stream or alias
 */
interface IndexAndAliasFromEs {
  name: string;
  // per https://github.com/elastic/elasticsearch/pull/57626
  attributes: Array<'open' | 'closed' | 'hidden' | 'frozen'>;
  data_stream?: string;
}

export interface ResolveIndexResponseFromES {
  indices: IndexAndAliasFromEs[];
  aliases: IndexAndAliasFromEs[];
  data_streams: Array<{ name: string; backing_indices: string[]; timestamp_field: string }>;
}

export type CallAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];

/**
 * @internal
 */
export interface SnapshotRestoreContext {
  client: ILegacyScopedClusterClient;
}

/**
 * @internal
 */
export interface SnapshotRestoreRequestHandlerContext extends RequestHandlerContext {
  snapshotRestore: SnapshotRestoreContext;
}

/**
 * @internal
 */
export type SnapshotRestoreRouter = IRouter<SnapshotRestoreRequestHandlerContext>;
