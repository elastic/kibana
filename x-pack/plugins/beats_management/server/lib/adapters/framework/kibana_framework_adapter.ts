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
  public license: 'oss' | 'trial' | 'standard' | 'basic' | 'gold' | 'platinum' = 'oss';
  public securityEnabled: boolean = false;
  public licenseActive: boolean = false;

  private server: any;
  private cryptoHash: string | null;

  constructor(private readonly PLUGIN_ID: string, hapiServer: any) {
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
        .feature(PLUGIN_ID)
        .registerLicenseCheckResultsGenerator(this.checkLicense);
    });
  }

  public on(event: 'xpack.status.green', cb: () => void) {
    const xpackMainPlugin = this.server.plugins.xpack_main;

    switch (event) {
      case 'xpack.status.green':
        xpackMainPlugin.status.once('green', cb);
    }
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
    if (!this.securityEnabled) {
      return;
    }
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
    const wrappedHandler = (licenseRequired: boolean, requiredRoles?: string[]) => async (
      request: any,
      h: any
    ) => {
      const xpackMainPlugin = this.server.plugins.xpack_main;
      const licenseCheckResults = xpackMainPlugin.info
        .feature(this.PLUGIN_ID)
        .getLicenseCheckResults();
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
          !wrappedRequest.user.roles.includes('superuser') &&
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

  public async getUser(request: FrameworkRequest) {
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
      return;
    }

    this.license = xPackInfo.license.getType();
    this.licenseActive = xPackInfo.license.isActive();
    this.securityEnabled = xPackInfo.feature('security').isEnabled();
    const VALID_LICENSE_MODES = ['trial', 'standard', 'gold', 'platinum'];

    const isLicenseValid = VALID_LICENSE_MODES.includes(this.license);
    const isLicenseActive = xPackInfo.license.isActive();

    // License is not valid
    if (!isLicenseValid) {
      return {
        securityEnabled: true,
        licenseValid: false,
        message: `Your ${
          this.license
        } license does not support Beats central management features. Please upgrade your license.`,
      };
    }

    // License is valid but not active, we go into a read-only mode.
    if (!isLicenseActive) {
      return {
        securityEnabled: true,
        licenseValid: false,
        message: `You cannot edit, create, or delete your Beats central management configurations because your ${
          this.license
        } license has expired.`,
      };
    }

    // Security is not enabled in ES
    if (!this.securityEnabled) {
      const message =
        'Security must be enabled in order to use Beats central management features.' +
        ' Please set xpack.security.enabled: true in your elasticsearch.yml.';
      return {
        securityEnabled: false,
        licenseValid: true,
        message,
      };
    }

    // License is valid and active
    return {
      securityEnabled: true,
      licenseValid: true,
    };
  }
}
