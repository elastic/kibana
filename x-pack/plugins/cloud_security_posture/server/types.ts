/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  CoreStart,
  CustomRequestHandlerContext,
  IRouter,
  IScopedClusterClient,
  KibanaResponseFactory,
  Logger,
  RequestHandler,
  RouteMethod,
  SavedObjectsClientContract,
<<<<<<< HEAD
=======
  IScopedClusterClient,
  KibanaResponseFactory,
  RequestHandler,
  RouteMethod,
>>>>>>> upstream/main
} from '@kbn/core/server';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  FleetRequestHandlerContext,
  FleetStartContract,
  PackagePolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspServerPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspServerPluginStart {}

export interface CspServerPluginSetupDeps {
  // required
  data: DataPluginSetup;
  taskManager: TaskManagerSetupContract;
  security: SecurityPluginSetup;
  // optional
  usageCollection?: UsageCollectionSetup;
}

export interface CspServerPluginStartDeps {
  // required
  data: DataPluginStart;
  fleet: FleetStartContract;
  taskManager: TaskManagerStartContract;
  security: SecurityPluginStart;
}

export type CspServerPluginStartServices = Promise<
  [CoreStart, CspServerPluginStartDeps, CspServerPluginStart]
>;

export interface CspApiRequestHandlerContext {
  user: ReturnType<SecurityPluginStart['authc']['getCurrentUser']>;
  logger: Logger;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  agentPolicyService: AgentPolicyServiceInterface;
  agentService: AgentService;
  packagePolicyService: PackagePolicyServiceInterface;
  packageService: PackageService;
}

export type CspRequestHandlerContext = CustomRequestHandlerContext<{
  csp: CspApiRequestHandlerContext;
  fleet: FleetRequestHandlerContext['fleet'];
}>;

/**
 * Convenience type for request handlers in CSP that includes the CspRequestHandlerContext type
 * @internal
 */
export type CspRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = RequestHandler<P, Q, B, CspRequestHandlerContext, Method, ResponseFactory>;

/**
 * Convenience type for routers in Csp that includes the CspRequestHandlerContext type
 * @internal
 */
export type CspRouter = IRouter<CspRequestHandlerContext>;
