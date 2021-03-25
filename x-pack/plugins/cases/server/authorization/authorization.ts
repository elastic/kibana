/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import Boom from '@hapi/boom';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { GetSpaceFn } from './types';
import { getClassFilter } from './utils';
import { AuthorizationAuditLogger, OperationDetails, Operations } from '.';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseClasses: Set<string>;
  private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseClasses,
    auditLogger,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseClasses: Set<string>;
    auditLogger: AuthorizationAuditLogger;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseClasses = caseClasses;
    this.auditLogger = auditLogger;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    getSpace,
    features,
    auditLogger,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
    auditLogger: AuthorizationAuditLogger;
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

    return new Authorization({ request, securityAuth, caseClasses, auditLogger });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(className: string, operation: OperationDetails) {
    const { securityAuth } = this;
    const isAvailableClass = this.featureCaseClasses.has(className);

    if (securityAuth && this.shouldCheckAuthorization()) {
      const requiredPrivileges: string[] = [
        securityAuth.actions.cases.get(className, operation.name),
      ];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isAvailableClass) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown class, but super users
         * don't actually get "privilege checked" so the made up class *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(this.auditLogger.failure({ username, className, operation }));
      }

      if (hasAllRequested) {
        this.auditLogger.success({ username, operation, className });
      } else {
        throw Boom.forbidden(this.auditLogger.failure({ className, operation, username }));
      }
    } else if (!isAvailableClass) {
      throw Boom.forbidden(this.auditLogger.failure({ className, operation }));
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(
    savedObjectType: string
  ): Promise<{
    filter?: KueryNode;
    ensureSavedObjectIsAuthorized: (className: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    const { securityAuth } = this;
    const operation = Operations.findCases;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { username, authorizedClassNames } = await this.getAuthorizedClassNames([operation]);

      if (!authorizedClassNames.length) {
        throw Boom.forbidden(this.auditLogger.failure({ username, operation }));
      }

      return {
        filter: getClassFilter(savedObjectType, authorizedClassNames),
        ensureSavedObjectIsAuthorized: (className: string) => {
          if (!authorizedClassNames.includes(className)) {
            throw Boom.forbidden(this.auditLogger.failure({ username, operation, className }));
          }
        },
        logSuccessfulAuthorization: () => {
          if (authorizedClassNames.length) {
            this.auditLogger.bulkSuccess({ username, classNames: authorizedClassNames, operation });
          }
        },
      };
    }

    return {
      ensureSavedObjectIsAuthorized: (className: string) => {},
      logSuccessfulAuthorization: () => {},
    };
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
