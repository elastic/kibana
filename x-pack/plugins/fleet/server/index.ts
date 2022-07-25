/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import { FleetPlugin } from './plugin';

export type {
  AgentService,
  AgentClient,
  ESIndexPatternService,
  PackageService,
  PackageClient,
  AgentPolicyServiceInterface,
  ArtifactsClientInterface,
  Artifact,
  ListArtifactsProps,
} from './services';
export { getRegistryUrl } from './services';

export type { FleetSetupContract, FleetSetupDeps, FleetStartContract } from './plugin';
export type {
  ExternalCallback,
  PutPackagePolicyUpdateCallback,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyCreateCallback,
  FleetRequestHandlerContext,
  PostPackagePolicyPostCreateCallback,
} from './types';
export { AgentNotFoundError, FleetUnauthorizedError } from './errors';
export { config } from './config';
export type { FleetConfigType } from './config';

export type { PackagePolicyServiceInterface } from './services/package_policy';

export { relativeDownloadUrlFromArtifact } from './services/artifacts/mappings';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};
