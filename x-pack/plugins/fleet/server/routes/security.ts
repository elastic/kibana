/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  RouteConfig,
  RouteMethod,
  KibanaRequest,
  RequestHandler,
  RequestHandlerContext,
  OnPostAuthHandler,
} from 'src/core/server';

import type { FleetAuthz } from '../../common';
import { calculateAuthz } from '../../common';

import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';

const SUPERUSER_AUTHZ_MESSAGE =
  'Access to Fleet API requires the superuser role and for stack security features to be enabled.';

function checkSecurityEnabled() {
  return appContextService.hasSecurity() && appContextService.getSecurityLicense().isEnabled();
}

function checkSuperuser(req: KibanaRequest) {
  if (!checkSecurityEnabled()) {
    return false;
  }

  const security = appContextService.getSecurity();
  const user = security.authc.getCurrentUser(req);
  if (!user) {
    return false;
  }

  const userRoles = user.roles || [];
  if (!userRoles.includes('superuser')) {
    return false;
  }

  return true;
}

function isSuperuser(req: KibanaRequest) {
  return checkSuperuser(req);
}

export async function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz> {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get('fleet-all'),
        security.authz.actions.api.get('fleet-setup'),
        security.authz.actions.api.get('integrations-all'),
        security.authz.actions.api.get('integrations-read'),
      ],
    });

    const [fleetAll, fleetSetup, intAll, intRead] = privileges.kibana;

    return calculateAuthz({
      fleet: {
        all: fleetAll.authorized,
        setup: fleetSetup.authorized,
      },

      integrations: {
        all: intAll.authorized,
        read: intRead.authorized,
      },
    });
  }

  return calculateAuthz({
    fleet: {
      all: true,
      setup: true,
    },

    integrations: {
      all: true,
      read: true,
    },
  });
}

function hasRequiredFleetAuthzPrivilege(
  authz: FleetAuthz,
  {
    fleetAuthz,
    fleetAllowFleetSetupPrivilege,
  }: { fleetAuthz?: FleetAuthzRequirements; fleetAllowFleetSetupPrivilege?: boolean }
): boolean {
  if (!checkSecurityEnabled()) {
    return false;
  }

  if (fleetAllowFleetSetupPrivilege) {
    // Temporary while agent call the setup API
    if (authz.fleet.setup) {
      return true;
    }
  }

  const missingAuthz = [];

  if (fleetAuthz && typeof fleetAuthz.fleet !== 'undefined') {
    for (const key of fleetAuthz.fleet) {
      if (!authz.fleet[key as keyof FleetAuthz['fleet']]) {
        missingAuthz.push(`fleet.${key}`);
      }
    }
  }

  if (fleetAuthz && typeof fleetAuthz.integrations !== 'undefined') {
    for (const key of fleetAuthz.integrations) {
      if (!authz.integrations[key as keyof FleetAuthz['integrations']]) {
        missingAuthz.push(`integrations.${key}`);
      }
    }
  }

  if (missingAuthz.length > 0) {
    return false;
  }

  return true;
}

interface FleetAuthzRequirements {
  fleet?: Array<keyof FleetAuthz['fleet']>;
  integrations?: Array<keyof FleetAuthz['integrations']>;
}

type FleetAuthzRouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
> = <P, Q, B>(
  route: FleetRouteConfig<P, Q, B, Method>,
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

interface FleetAuthzRouteConfig {
  fleetAuthz?: FleetAuthzRequirements;
  fleetRequireSuperuser?: boolean;
  // TODO temporary required while agents call Fleet setup
  fleetAllowFleetSetupPrivilege?: boolean;
}

type FleetRouteConfig<P, Q, B, Method extends RouteMethod> = RouteConfig<P, Q, B, Method> &
  FleetAuthzRouteConfig;

// Fleet router that allow to add required access when registering route
export interface FleetAuthzRouter<
  TContext extends FleetRequestHandlerContext = FleetRequestHandlerContext
> extends IRouter<TContext> {
  get: FleetAuthzRouteRegistrar<'get', TContext>;
  delete: FleetAuthzRouteRegistrar<'delete', TContext>;
  post: FleetAuthzRouteRegistrar<'post', TContext>;
  put: FleetAuthzRouteRegistrar<'put', TContext>;
  patch: FleetAuthzRouteRegistrar<'patch', TContext>;
}

function shouldHandlePostAuthRequest(req: KibanaRequest) {
  if (req?.route?.options?.tags) {
    return req.route.options.tags.some((tag) => tag.match(/^fleet:authz/));
  }
  return false;
}
function deserializeAuthzConfig(tags: readonly string[]): FleetAuthzRouteConfig {
  let fleetRequireSuperuser: boolean | undefined;
  let fleetAllowFleetSetupPrivilege: boolean | undefined;
  let fleetAuthz: FleetAuthzRequirements | undefined;
  for (const tag of tags) {
    if (!tag.match(/^fleet:authz/)) {
      continue;
    }

    if (tag === 'fleet:authz:requireSuperuser') {
      fleetRequireSuperuser = true;
    }

    if (tag === 'fleet:authz:allowFleetSetupPrivilege') {
      fleetAllowFleetSetupPrivilege = true;
    }

    const fleetMatches = tag.match(/^fleet:authz:fleet:([a-zA-Z]*)/);
    if (fleetMatches) {
      const role = fleetMatches[1];
      if (!fleetAuthz) {
        fleetAuthz = {};
      }
      if (!fleetAuthz.fleet) {
        fleetAuthz.fleet = [];
      }

      fleetAuthz.fleet.push(role as keyof FleetAuthz['fleet']);
    }
    const integrationMatches = tag.match(/^fleet:authz:integrations:([a-zA-Z]*)/);
    if (integrationMatches) {
      const role = integrationMatches[1];
      if (!fleetAuthz) {
        fleetAuthz = {};
      }
      if (!fleetAuthz.integrations) {
        fleetAuthz.integrations = [];
      }

      fleetAuthz.integrations.push(role as keyof FleetAuthz['integrations']);
    }
  }

  return { fleetRequireSuperuser, fleetAllowFleetSetupPrivilege, fleetAuthz };
}
function serializeAuthzConfig(config: FleetAuthzRouteConfig): string[] {
  const tags = [];

  if (config.fleetRequireSuperuser) {
    tags.push(`fleet:authz:requireSuperuser`);
  }
  if (config.fleetAllowFleetSetupPrivilege) {
    tags.push(`fleet:authz:allowFleetSetupPrivilege`);
  }
  if (config.fleetAuthz?.fleet) {
    for (const fleetRole of config.fleetAuthz?.fleet) {
      tags.push(`fleet:authz:fleet:${fleetRole}`);
    }
  }
  if (config.fleetAuthz?.integrations) {
    for (const integrationRole of config.fleetAuthz?.integrations) {
      tags.push(`fleet:authz:integrations:${integrationRole}`);
    }
  }

  return tags;
}

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>
): { router: FleetAuthzRouter<TContext>; onPostAuthHandler: OnPostAuthHandler } {
  function buildFleetAuthzRouteConfig<P, Q, B, Method extends RouteMethod>({
    fleetAuthz,
    fleetAllowFleetSetupPrivilege,
    fleetRequireSuperuser,
    ...routeConfig
  }: FleetRouteConfig<P, Q, B, Method>) {
    return {
      ...routeConfig,
      options: {
        ...routeConfig.options,
        tags: [
          ...(routeConfig?.options?.tags ?? []),
          ...serializeAuthzConfig({
            fleetAuthz,
            fleetAllowFleetSetupPrivilege,
            fleetRequireSuperuser,
          }),
        ],
      },
    };
  }

  const fleetAuthzOnPostAuthHandler: OnPostAuthHandler = async (req, res, toolkit) => {
    if (!shouldHandlePostAuthRequest(req)) {
      return toolkit.next();
    }

    if (!checkSecurityEnabled()) {
      return res.forbidden();
    }

    const fleetAuthzConfig = deserializeAuthzConfig(req.route.options.tags);

    if (!fleetAuthzConfig) {
      return toolkit.next();
    }
    if (fleetAuthzConfig.fleetRequireSuperuser) {
      if (!isSuperuser(req)) {
        return res.forbidden({
          body: {
            message: SUPERUSER_AUTHZ_MESSAGE,
          },
        });
      }
      return toolkit.next();
    }
    const authz = await getAuthzFromRequest(req);
    if (!hasRequiredFleetAuthzPrivilege(authz, fleetAuthzConfig)) {
      return res.forbidden();
    }

    return toolkit.next();
  };

  const fleetAuthzRouter: FleetAuthzRouter<TContext> = {
    get: (routeConfig, handler) => router.get(buildFleetAuthzRouteConfig(routeConfig), handler),
    delete: (routeConfig, handler) =>
      router.delete(buildFleetAuthzRouteConfig(routeConfig), handler),
    post: (routeConfig, handler) => router.post(buildFleetAuthzRouteConfig(routeConfig), handler),
    put: (routeConfig, handler) => router.put(buildFleetAuthzRouteConfig(routeConfig), handler),
    patch: (routeConfig, handler) => router.patch(buildFleetAuthzRouteConfig(routeConfig), handler),
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };

  return { router: fleetAuthzRouter, onPostAuthHandler: fleetAuthzOnPostAuthHandler };
}
