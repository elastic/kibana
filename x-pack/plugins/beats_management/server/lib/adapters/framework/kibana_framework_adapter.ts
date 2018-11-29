/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import Boom from 'boom';
import { difference } from 'lodash';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import { PLUGIN } from '../../../../common/constants/plugin';
import { wrapRequest } from '../../../utils/wrap_request';
import { FrameworkRequest } from './adapter_types';
import {
  BackendFrameworkAdapter,
  FrameworkInternalUser,
  FrameworkResponse,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapter_types';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser: FrameworkInternalUser = {
    kind: 'internal',
  };
  public version: string;
  private server: any;
  private cryptoHash: string | null;

  constructor(hapiServer: any) {
    this.server = hapiServer;
    if (hapiServer.plugins.kibana) {
      this.version = hapiServer.plugins.kibana.status.plugin.version;
    } else {
      this.version = 'unknown';
    }
    this.cryptoHash = null;
    this.validateConfig();

    const xpackMainPlugin = hapiServer.plugins.xpack_main;
    const thisPlugin = hapiServer.plugins.beats_management;

    mirrorPluginStatus(xpackMainPlugin, thisPlugin);
    xpackMainPlugin.status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info
        .feature(PLUGIN.ID)
        .registerLicenseCheckResultsGenerator((xPackInfo: any) => this.checkLicense(xPackInfo));
    });
  }
  // TODO make base path a constructor level param
  public getSetting(settingPath: string) {
    // TODO type check server properly
    if (settingPath === 'xpack.beats.encryptionKey') {
      // @ts-ignore
      return this.server.config().get(settingPath) || this.cryptoHash;
    }
    // @ts-ignore
    return this.server.config().get(settingPath) || this.cryptoHash;
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerRoute<
    RouteRequest extends FrameworkWrappableRequest,
    RouteResponse extends FrameworkResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    const hasAny = (roles: string[], requiredRoles: string[]) =>
      requiredRoles.some(r => roles.includes(r));

    const wrappedHandler = (licenseRequired: boolean, requiredRoles?: string[]) => async (
      request: any,
      h: any
    ) => {
      const xpackMainPlugin = this.server.plugins.xpack_main;
      const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
      if (licenseRequired && !licenseCheckResults.licenseValid) {
        return Boom.forbidden(licenseCheckResults.message);
      }
      const wrappedRequest = wrapRequest(request);
      if (requiredRoles) {
        if (wrappedRequest.user.kind !== 'authenticated') {
          return h.response().code(403);
        }
        wrappedRequest.user = {
          ...wrappedRequest.user,
          ...(await this.getUser(request)),
        };

        if (
          wrappedRequest.user.kind === 'authenticated' &&
          (!hasAny(wrappedRequest.user.roles, this.getSetting('xpack.beats.defaultUserRoles')) ||
            !wrappedRequest.user.roles) &&
          difference(requiredRoles, wrappedRequest.user.roles).length !== 0
        ) {
          return h.response().code(403);
        }
      }
      return route.handler(wrappedRequest, h);
    };

    this.server.route({
      handler: wrappedHandler(route.licenseRequired || false, route.requiredRoles),
      method: route.method,
      path: route.path,
      config: route.config,
    });
  }

  private async getUser(request: FrameworkRequest) {
    try {
      return await this.server.plugins.security.getUser(request);
    } catch (e) {
      return null;
    }
  }

  // TODO make key a param
  private validateConfig() {
    // @ts-ignore
    const config = this.server.config();
    const encryptionKey = config.get('xpack.beats.encryptionKey');

    if (!encryptionKey) {
      this.server.log(
        'Using a default encryption key for xpack.beats.encryptionKey. It is recommended that you set xpack.beats.encryptionKey in kibana.yml with a unique token'
      );
      this.cryptoHash = 'xpack_beats_default_encryptionKey';
    }
  }

  // TODO this should NOT be in an adapter, break up and move validation to a lib
  private checkLicense(xPackInfo: any) {
    // If, for some reason, we cannot get the license information
    // from Elasticsearch, assume worst case and disable the Logstash pipeline UI
    if (!xPackInfo || !xPackInfo.isAvailable()) {
      return {
        securityEnabled: false,
        licenseValid: false,
        message:
          'You cannot manage Beats central management because license information is not available at this time.',
      };
    }

    const VALID_LICENSE_MODES = ['trial', 'standard', 'gold', 'platinum'];

    const isLicenseValid = xPackInfo.license.isOneOf(VALID_LICENSE_MODES);
    const isLicenseActive = xPackInfo.license.isActive();
    const licenseType = xPackInfo.license.getType();
    const isSecurityEnabled = xPackInfo.feature('security').isEnabled();

    // License is not valid
    if (!isLicenseValid) {
      return {
        defaultUserRoles: this.getSetting('xpack.beats.defaultUserRoles'),
        securityEnabled: true,
        licenseValid: false,
        licenseExpired: false,
        message: `Your ${licenseType} license does not support Beats central management features. Please upgrade your license.`,
      };
    }

    // License is valid but not active, we go into a read-only mode.
    if (!isLicenseActive) {
      return {
        defaultUserRoles: this.getSetting('xpack.beats.defaultUserRoles'),
        securityEnabled: true,
        licenseValid: true,
        licenseExpired: true,
        message: `You cannot edit, create, or delete your Beats central management configurations because your ${licenseType} license has expired.`,
      };
    }

    // Security is not enabled in ES
    if (!isSecurityEnabled) {
      const message =
        'Security must be enabled in order to use Beats central management features.' +
        ' Please set xpack.security.enabled: true in your elasticsearch.yml.';
      return {
        defaultUserRoles: this.getSetting('xpack.beats.defaultUserRoles'),
        securityEnabled: false,
        licenseValid: true,
        licenseExpired: false,

        message,
      };
    }

    // License is valid and active
    return {
      defaultUserRoles: this.getSetting('xpack.beats.defaultUserRoles'),
      securityEnabled: true,
      licenseValid: true,
      licenseExpired: false,
    };
  }
}
