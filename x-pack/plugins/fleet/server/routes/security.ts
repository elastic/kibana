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
} from '@kbn/core/server';

import type { FleetAuthz } from '../../common';
import { calculateAuthz, INTEGRATIONS_PLUGIN_ID } from '../../common';

import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';
import { PLUGIN_ID } from '../constants';

function checkSecurityEnabled() {
  return appContextService.getSecurityLicense().isEnabled();
}

export function checkSuperuser(req: KibanaRequest) {
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

function getAuthorizationFromPrivileges(
  kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>,
  searchPrivilege: string
) {
  const privilege = kibanaPrivileges.find((p) => p.privilege.includes(searchPrivilege));
  return privilege ? privilege.authorized : false;
}

export async function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz> {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get(`${PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-read`),
        security.authz.actions.api.get('fleet-setup'),
      ],
    });
    const fleetAllAuth = getAuthorizationFromPrivileges(privileges.kibana, `${PLUGIN_ID}-all`);
    const intAllAuth = getAuthorizationFromPrivileges(
      privileges.kibana,
      `${INTEGRATIONS_PLUGIN_ID}-all`
    );
    const intReadAuth = getAuthorizationFromPrivileges(
      privileges.kibana,
      `${INTEGRATIONS_PLUGIN_ID}-read`
    );
    const fleetSetupAuth = getAuthorizationFromPrivileges(privileges.kibana, 'fleet-setup');

    return calculateAuthz({
      fleet: { all: fleetAllAuth, setup: fleetSetupAuth },
      integrations: { all: intAllAuth, read: intReadAuth },
      isSuperuser: checkSuperuser(req),
    });
  }

  return calculateAuthz({
    fleet: { all: false, setup: false },
    integrations: { all: false, read: false },
    isSuperuser: false,
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
  { fleetAuthz }: { fleetAuthz?: FleetAuthzRequirements }
): boolean {
  if (!checkSecurityEnabled()) {
    return false;
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
  let fleetAuthz: FleetAuthzRequirements | undefined;
  for (const tag of tags) {
    if (!tag.match(/^fleet:authz/)) {
      continue;
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

  return { fleetAuthz };
}
function serializeAuthzConfig(config: FleetAuthzRouteConfig): string[] {
  const tags: string[] = [];

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
