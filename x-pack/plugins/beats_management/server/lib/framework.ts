/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { difference } from 'lodash';
import { FrameworkRouteHandler } from './adapters/framework/adapter_types';
import { FrameworkRequest } from './adapters/framework/adapter_types';
import {
  BackendFrameworkAdapter,
  FrameworkResponse,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapters/framework/adapter_types';

export class FrameworkLib {
  public exposeStaticDir = this.adapter.exposeStaticDir;
  public internalUser = this.adapter.internalUser;
  constructor(private readonly adapter: BackendFrameworkAdapter) {
    this.validateConfig();
  }

  public registerRoute<
    RouteRequest extends FrameworkWrappableRequest,
    RouteResponse extends FrameworkResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.adapter.registerRoute({
      ...route,
      handler: this.wrapRouteWithSecurity(
        route.handler,
        route.licenseRequired || [],
        route.requiredRoles
      ),
    });
  }

  public getSetting(setting: 'encryptionKey' | 'enrollmentTokensTtlInSeconds') {
    return this.adapter.getSetting(`xpack.beats.${setting}`);
  }

  /**
   * Expired `null` happens when we have no xpack info
   */
  get license() {
    return {
      type: this.adapter.info ? this.adapter.info.license.type : 'unknown',
      expired: this.adapter.info ? this.adapter.info.license.expired : null,
    };
  }

  get securityIsEnabled() {
    return this.adapter.info ? this.adapter.info.security.enabled : false;
  }

  private validateConfig() {
    const encryptionKey = this.adapter.getSetting('xpack.beats.encryptionKey');

    if (!encryptionKey) {
      this.adapter.log(
        'Using a default encryption key for xpack.beats.encryptionKey. It is recommended that you set xpack.beats.encryptionKey in kibana.yml with a unique token'
      );
    }
  }

  private wrapRouteWithSecurity(
    handler: FrameworkRouteHandler<any, any>,
    requiredLicense: string[],
    requiredRoles?: string[]
  ) {
    return async (request: FrameworkRequest, h: any) => {
      if (
        requiredLicense.length > 0 &&
        (this.license.expired || !requiredLicense.includes(this.license.type))
      ) {
        return Boom.forbidden(
          `Your ${
            this.license
          } license does not support this API or is expired. Please upgrade your license.`
        );
      }

      if (requiredRoles) {
        if (request.user.kind !== 'authenticated') {
          return h.response().code(403);
        }

        if (
          request.user.kind === 'authenticated' &&
          !request.user.roles.includes('superuser') &&
          difference(requiredRoles, request.user.roles).length !== 0
        ) {
          return h.response().code(403);
        }
      }
      return await handler(request, h);
    };
  }
}
