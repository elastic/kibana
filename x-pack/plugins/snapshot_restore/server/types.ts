/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CustomRequestHandlerContext, IScopedClusterClient } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { CloudSetup } from '../../cloud/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { License } from './services';
import { wrapEsError } from './lib';
import { handleEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  cloud?: CloudSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSlmEnabled: boolean;
    isSecurityEnabled: () => boolean;
    isCloudEnabled: boolean;
  };
  lib: {
    wrapEsError: typeof wrapEsError;
    handleEsError: typeof handleEsError;
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

export type CallAsCurrentUser = IScopedClusterClient['asCurrentUser'];

/**
 * @internal
 */
export interface SnapshotRestoreContext {
  client: IScopedClusterClient;
}

/**
 * @internal
 */
export type SnapshotRestoreRequestHandlerContext = CustomRequestHandlerContext<{
  snapshotRestore: SnapshotRestoreContext;
}>;
