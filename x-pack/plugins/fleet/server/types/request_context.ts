/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaResponseFactory,
  RequestHandler,
  CustomRequestHandlerContext,
  RouteMethod,
  SavedObjectsClientContract,
  IRouter,
} from '@kbn/core/server';

import type { FleetAuthz } from '../../common/authz';
import type { AgentClient } from '../services';
import type { PackagePolicyClient } from '../services/package_policy_service';
import type { UninstallTokenServiceInterface } from '../services/security/uninstall_token_service';

/** @internal */
export type FleetRequestHandlerContext = CustomRequestHandlerContext<{
  fleet: {
    /** {@link FleetAuthz} */
    authz: FleetAuthz;
    /** {@link AgentClient} */
    agentClient: {
      asCurrentUser: AgentClient;
      asInternalUser: AgentClient;
    };
    packagePolicyService: {
      asCurrentUser: PackagePolicyClient;
      asInternalUser: PackagePolicyClient;
    };
    uninstallTokenService: {
      asCurrentUser: UninstallTokenServiceInterface;
    };
    /**
     * Saved Objects client configured to use kibana_system privileges instead of end-user privileges. Should only be
     * used by routes that have additional privilege checks for authorization (such as requiring superuser).
     */
    readonly internalSoClient: SavedObjectsClientContract;

    spaceId: string;
    /**
     * If data is to be limited to the list of integration package names. This will be set when
     * authz to the API was granted only based on Package Privileges.
     */
    limitedToPackages: string[] | undefined;
  };
}>;

/**
 * Convenience type for request handlers in Fleet that includes the FleetRequestHandlerContext type
 * @internal
 */
export type FleetRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = RequestHandler<P, Q, B, FleetRequestHandlerContext, Method, ResponseFactory>;

/**
 * Convenience type for routers in Fleet that includes the FleetRequestHandlerContext type
 * @internal
 */
export type FleetRouter = IRouter<FleetRequestHandlerContext>;
