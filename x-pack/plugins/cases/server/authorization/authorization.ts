/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import Boom from '@hapi/boom';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { GetSpaceFn } from './types';
import { getClassFilter } from './utils';
import { OperationDetails, Operations } from '.';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseClasses: Set<string>;
  // TODO: create this
  // private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseClasses,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseClasses: Set<string>;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseClasses = caseClasses;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    getSpace,
    features,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
  }): Promise<Authorization> {
    // Since we need to do async operations, this static method handles that before creating the Auth class
    let caseClasses: Set<string>;
    try {
      const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      caseClasses = new Set(
        features
          .getKibanaFeatures()
          // get all the features' cases classes that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.cases ?? [])
      );
    } catch (error) {
      caseClasses = new Set<string>();
    }

    return new Authorization({ request, securityAuth, caseClasses });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(className: string, operation: OperationDetails) {
    const { securityAuth } = this;
    const isAvailableClass = this.featureCaseClasses.has(className);

    // TODO: throw if the request is not authorized
    if (securityAuth && this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
      const requiredPrivileges: string[] = [
        securityAuth.actions.cases.get(className, operation.name),
      ];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isAvailableClass) {
        // TODO: throw if any of the class are not available
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown class, but super users
         * don't actually get "privilege checked" so the made up class *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        // TODO: audit log using `username`
        throw Boom.forbidden('User does not have permissions for this class');
      }

      if (hasAllRequested) {
        // TODO: user authorized. log success
      } else {
        const authorizedPrivileges = privileges.kibana.reduce<string[]>((acc, privilege) => {
          if (privilege.authorized) {
            return [...acc, privilege.privilege];
          }
          return acc;
        }, []);

        const unauthorizedPrivilages = requiredPrivileges.filter(
          (privilege) => !authorizedPrivileges.includes(privilege)
        );

        // TODO: audit log
        // TODO: User unauthorized. throw an error. authorizedPrivileges & unauthorizedPrivilages are needed for logging.
        throw Boom.forbidden('Not authorized for this class');
      }
    } else if (!isAvailableClass) {
      // TODO: throw an error
      throw Boom.forbidden('Security is disabled but no class was found');
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(
    savedObjectType: string
  ): Promise<{
    filter?: string;
    ensureSavedObjectIsAuthorized: (className: string) => void;
  }> {
    const { securityAuth } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { authorizedClassNames } = await this.getAuthorizedClassNames([Operations.findCases]);

      if (!authorizedClassNames.length) {
        // TODO: Better error message, log error
        throw Boom.forbidden('Not authorized for this class');
      }

      return {
        filter: getClassFilter(savedObjectType, authorizedClassNames),
        ensureSavedObjectIsAuthorized: (className: string) => {
          if (!authorizedClassNames.includes(className)) {
            // TODO: log error
            throw Boom.forbidden('Not authorized for this class');
          }
        },
      };
    }

    return { ensureSavedObjectIsAuthorized: (className: string) => {} };
  }

  private async getAuthorizedClassNames(
    operations: OperationDetails[]
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedClassNames: string[];
  }> {
    const { securityAuth, featureCaseClasses } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const requiredPrivileges = new Map<string, [string]>();

      for (const className of featureCaseClasses) {
        for (const operation of operations) {
          requiredPrivileges.set(securityAuth.actions.cases.get(className, operation.name), [
            className,
          ]);
        }
      }

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      return {
        hasAllRequested,
        username,
        authorizedClassNames: hasAllRequested
          ? Array.from(featureCaseClasses)
          : privileges.kibana.reduce<string[]>(
              (authorizedClassNames, { authorized, privilege }) => {
                if (authorized && requiredPrivileges.has(privilege)) {
                  const [className] = requiredPrivileges.get(privilege)!;
                  authorizedClassNames.push(className);
                }

                return authorizedClassNames;
              },
              []
            ),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedClassNames: Array.from(featureCaseClasses),
      };
    }
  }
}
