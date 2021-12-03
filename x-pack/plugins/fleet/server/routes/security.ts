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

interface Authz {
  [k: string]: Authz | boolean;
}

function containsRequirement(authz: Authz, requirements: DeepPartialTruthy<Authz>) {
  if (!authz) {
    return false;
  }
  for (const key of Object.keys(requirements)) {
    if (typeof requirements[key] !== 'undefined' && typeof requirements[key] === 'boolean') {
      if (!authz[key]) {
        return false;
      }
    } else if (
      !containsRequirement(authz[key] as Authz, requirements[key] as DeepPartialTruthy<Authz>)
    ) {
      return false;
    }
  }
  return true;
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
  if (fleetAuthz && !containsRequirement(authz as unknown as Authz, fleetAuthz)) {
    return false;
  }

  return true;
}

type DeepPartialTruthy<T> = {
  [P in keyof T]?: T[P] extends boolean ? true : DeepPartialTruthy<T[P]>;
};

type FleetAuthzRequirements = DeepPartialTruthy<FleetAuthz>;

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

    if (!fleetAuthz) {
      fleetAuthz = {};
    }

    tag
      .replace(/^fleet:authz:/, '')
      .split(':')
      .reduce((acc: any, key, idx, keys) => {
        if (idx === keys.length + 1) {
          acc[key] = true;

          return acc;
        }

        if (!acc[key]) {
          acc[key] = {};
        }

        return acc[key];
      }, fleetAuthz);
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

  if (config.fleetAuthz) {
    function fleetAuthzToTags(requirements: DeepPartialTruthy<Authz>, prefix: string = '') {
      for (const key of Object.keys(requirements)) {
        if (typeof requirements[key] === 'boolean') {
          tags.push(`fleet:authz:${prefix}${key}`);
        } else if (typeof requirements[key] !== 'undefined') {
          fleetAuthzToTags(requirements[key] as DeepPartialTruthy<Authz>, `${key}:`);
        }
      }
    }

    fleetAuthzToTags(config.fleetAuthz);
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
