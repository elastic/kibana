/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, result } from 'lodash';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type {
  IRouter,
  RouteConfig,
  RouteMethod,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  OnPostAuthHandler,
  IKibanaResponse,
} from '@kbn/core/server';

import { deepFreeze } from '@kbn/std';

import type { FleetAuthz } from '../../common';
import { INTEGRATIONS_PLUGIN_ID, PACKAGE_POLICY_API_ROUTES } from '../../common';
import { calculateAuthz, calculatePackagePrivilegesFromKibanaPrivileges } from '../../common/authz';

import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';
import { PLUGIN_ID, ENDPOINT_PRIVILEGES } from '../constants';

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
    const endpointPrivileges = ENDPOINT_PRIVILEGES.map((privilege) =>
      security.authz.actions.api.get(`${DEFAULT_APP_CATEGORIES.security.id}-${privilege}`)
    );
    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get(`${PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${PLUGIN_ID}-setup`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-all`),
        security.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-read`),
        ...endpointPrivileges,
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

    return {
      ...calculateAuthz({
        fleet: { all: fleetAllAuth, setup: fleetSetupAuth },
        integrations: {
          all: intAllAuth,
          read: intReadAuth,
        },
        isSuperuser: checkSuperuser(req),
      }),
      packagePrivileges: calculatePackagePrivilegesFromKibanaPrivileges(privileges.kibana),
    };
  }

  return calculateAuthz({
    fleet: { all: false, setup: false },
    integrations: {
      all: false,
      read: false,
    },
    isSuperuser: false,
  });
}

// needed from Read routes
export const READ_ENDPOINT_PACKAGE_PRIVILEGES: DeepPartialTruthy<FleetAuthz> = Object.freeze({
  packagePrivileges: {
    endpoint: {
      actions: {
        readPolicyManagement: {
          executePackageAction: true,
        },
        readTrustedApplications: {
          executePackageAction: true,
        },
        readEventFilters: {
          executePackageAction: true,
        },
        readHostIsolationExceptions: {
          executePackageAction: true,
        },
        readBlocklist: {
          executePackageAction: true,
        },
      },
    },
  },
});

// needed from CUD routes
export const WRITE_ENDPOINT_PACKAGE_PRIVILEGES: DeepPartialTruthy<FleetAuthz> = Object.freeze({
  packagePrivileges: {
    endpoint: {
      actions: {
        writePolicyManagement: {
          executePackageAction: true,
        },
        writeTrustedApplications: {
          executePackageAction: true,
        },
        writeEventFilters: {
          executePackageAction: true,
        },
        writeHostIsolationExceptions: {
          executePackageAction: true,
        },
        writeBlocklist: {
          executePackageAction: true,
        },
      },
    },
  },
});

/**
 * The authorization requirements needed for an API route. Route authorization requirements are
 * defined either via an `all` object, where all value must be `true` in order for access to be granted,
 * or, by an `any` object, where any value defined that is set to `true` will grant access to the API
 */
export const ROUTE_AUTHZ_REQUIREMENTS = deepFreeze<
  Record<
    string,
    {
      any?: FleetAuthzRequirements;
      all?: FleetAuthzRequirements;
    }
  >
>({
  [PACKAGE_POLICY_API_ROUTES.LIST_PATTERN]: {
    any: {
      integrations: {
        readIntegrationPolicies: true,
      },
      packagePrivileges: {
        endpoint: {
          actions: {
            readPolicyManagement: {
              executePackageAction: true,
            },
            readTrustedApplications: {
              executePackageAction: true,
            },
            readEventFilters: {
              executePackageAction: true,
            },
            readHostIsolationExceptions: {
              executePackageAction: true,
            },
            readBlocklist: {
              executePackageAction: true,
            },
          },
        },
      },
    },
  },
});

export interface RouteAuthz {
  granted: boolean;
  grantedByFleetPrivileges: boolean;
  scopeDataToPackages: string[] | undefined;
}

/**
 * Calculates Authz information for a Route
 *
 * @param fleetAuthz
 * @param requiredAuthz
 */
export const calculateRouteAuthz = (
  fleetAuthz: FleetAuthz,
  requiredAuthz: {
    any?: FleetAuthzRequirements;
    all?: FleetAuthzRequirements;
  }
): RouteAuthz => {
  const response: RouteAuthz = {
    granted: false,
    grantedByFleetPrivileges: false,
    scopeDataToPackages: undefined,
  };
  const fleetAuthzFlatten = flatten(fleetAuthz);

  const isPrivilegeGranted = (flattenPrivilegeKey: string): boolean =>
    Boolean(fleetAuthzFlatten[flattenPrivilegeKey]);

  if (requiredAuthz.all) {
    response.granted = Object.keys(flatten(requiredAuthz.all)).every(isPrivilegeGranted);

    if (response.granted) {
      if (requiredAuthz.all.fleet || requiredAuthz.all.integrations) {
        response.grantedByFleetPrivileges = true;
      }

      return response;
    }
  }

  if (requiredAuthz.any) {
    response.granted = Object.keys(flatten(requiredAuthz.any)).some(isPrivilegeGranted);

    if (response.granted) {
      // Figure out if authz was granted via Fleet privileges
      if (requiredAuthz.any.fleet || requiredAuthz.any.integrations) {
        const fleetAnyPrivileges = pick(requiredAuthz.any, ['fleet', 'integrations']);

        response.grantedByFleetPrivileges = Object.keys(flatten(fleetAnyPrivileges)).some(
          isPrivilegeGranted
        );
      }

      // If access was not granted via Fleet Authz, then retrieve a list of Package names for which the
      // data should be sopped
      if (!response.grantedByFleetPrivileges) {
        response.scopeDataToPackages = Object.keys(requiredAuthz.any.packagePrivileges ?? {});
      }

      return response;
    }
  }

  return response;
};

/**
 * Utility to flatten an object's key all the way down to the last value.
 * @param source
 */
function flatten(source: FleetAuthzRequirements | FleetAuthz): Record<string, boolean> {
  const response: Record<string, boolean> = {};
  const processKeys = (prefix: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      const objectKeys = Object.keys(value);

      for (const key of objectKeys) {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, (value as Record<string, boolean>)[key]);
      }
    } else if (Array.isArray(value)) {
      value.forEach((subValue, key) => {
        processKeys(`${prefix}${prefix ? '.' : ''}${key}`, subValue);
      });
    } else {
      response[prefix] = value as boolean;
    }
  };

  processKeys('', source);

  return response;
}

// exported only for testing
export function buildPathsFromRequiredAuthz(required: FleetAuthzRequirements): string[] {
  const paths: string[] = [];
  if (required) {
    function fleetAuthzToPaths(requirements: DeepPartialTruthy<Authz>, prefix: string = '') {
      for (const key of Object.keys(requirements)) {
        if (typeof requirements[key] === 'boolean') {
          paths.push(`${prefix}${key}`);
        } else if (typeof requirements[key] !== 'undefined') {
          fleetAuthzToPaths(requirements[key] as DeepPartialTruthy<Authz>, `${prefix}${key}.`);
        }
      }
    }
    fleetAuthzToPaths(required);
  }
  return paths;
}

export function validateSecurityRbac(
  fleetAuthz: FleetAuthz,
  requiredAuthz: {
    any?: FleetAuthzRequirements;
    all?: FleetAuthzRequirements;
  }
): boolean {
  const getBoolListFromPaths = (reqAuthz: FleetAuthzRequirements): boolean[] =>
    buildPathsFromRequiredAuthz(reqAuthz).reduce<boolean[]>((acc, path) => {
      // add the bool value of the given path in FleetAuthz in the list
      acc.push(result(fleetAuthz, path));
      return acc;
    }, []);

  const invalidAny =
    !requiredAuthz.all &&
    requiredAuthz.any &&
    !getBoolListFromPaths(requiredAuthz.any).some((v) => v);
  const invalidAll =
    !requiredAuthz.any &&
    requiredAuthz.all &&
    !getBoolListFromPaths(requiredAuthz.all).every((v) => v);

  // integration privileges should be all true or any of the endpoint privileges should be true
  // e.g. epm/BULK_INSTALL_PATTERN
  const invalidAnyAndAll =
    requiredAuthz.any &&
    !(
      getBoolListFromPaths(requiredAuthz.any).some((v) => v) ||
      (requiredAuthz.all && getBoolListFromPaths(requiredAuthz.all).every((v) => v))
    );

  if (invalidAny || invalidAll || invalidAnyAndAll) {
    return false;
  }
  return true;
}

export function doesNotHaveRequiredFleetAuthz(
  authz: FleetAuthz,
  fleetAuthzConfig: FleetAuthzRouteConfig
) {
  return (
    fleetAuthzConfig.fleetAuthz &&
    ((typeof fleetAuthzConfig.fleetAuthz === 'function' && !fleetAuthzConfig.fleetAuthz(authz)) ||
      (fleetAuthzConfig.fleetAuthz &&
        typeof fleetAuthzConfig.fleetAuthz !== 'function' &&
        !calculateRouteAuthz(authz, { all: fleetAuthzConfig.fleetAuthz }).granted))
  );
}

interface Authz {
  [k: string]: Authz | boolean;
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

type FleetAuthzRouterConfigParam = FleetAuthzRequirements | ((userAuthz: FleetAuthz) => boolean);
export interface FleetAuthzRouteConfig<
  T extends FleetAuthzRouterConfigParam = FleetAuthzRouterConfigParam
> {
  fleetAuthz?: T;
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

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>
): { router: FleetAuthzRouter<TContext>; onPostAuthHandler: OnPostAuthHandler } {
  const fleetAuthzOnPostAuthHandler: OnPostAuthHandler = async (_, res, toolkit) => {
    if (!checkSecurityEnabled()) {
      return res.forbidden();
    }

    return toolkit.next();
  };

  const routerAuthzWrapper = async <R extends RouteMethod>({
    context,
    request,
    response,
    handler,
    hasRequiredAuthz,
  }: {
    context: TContext;
    request: KibanaRequest;
    response: KibanaResponseFactory;
    handler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
    hasRequiredAuthz?: FleetAuthzRouterConfigParam;
  }): Promise<IKibanaResponse<any>> => {
    const requestedAuthz = await getAuthzFromRequest(request);
    if (
      hasRequiredAuthz &&
      ((typeof hasRequiredAuthz === 'function' && hasRequiredAuthz(requestedAuthz)) ||
        (typeof hasRequiredAuthz !== 'function' &&
          validateSecurityRbac(requestedAuthz, { all: hasRequiredAuthz })))
    ) {
      return handler(context, request, response);
    }
    return response.forbidden();
  };

  const fleetAuthzRouter: FleetAuthzRouter<TContext> = {
    get: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.get(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    delete: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.delete(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    post: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.post(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    put: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.put(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    patch: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.patch(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };

  return { router: fleetAuthzRouter, onPostAuthHandler: fleetAuthzOnPostAuthHandler };
}
