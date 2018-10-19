/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import Boom from 'boom';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import { PLUGIN } from '../../../../common/constants/plugin';
import { wrapRequest } from '../../../utils/wrap_request';
import {
  BackendFrameworkAdapter,
  FrameworkInternalUser,
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
        .registerLicenseCheckResultsGenerator(this.checkLicense);
    });
  }

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
    if (!this.isSecurityEnabled()) {
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

  public registerRoute<RouteRequest extends FrameworkWrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ) {
    const wrappedHandler = (licenseRequired: boolean) => (request: any, reply: any) => {
      const xpackMainPlugin = this.server.plugins.xpack_main;
      const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
      if (licenseRequired && !licenseCheckResults.licenseValid) {
        reply(Boom.forbidden(licenseCheckResults.message));
      }
      return route.handler(wrapRequest(request), reply);
    };

    this.server.route({
      handler: wrappedHandler(route.licenseRequired || false),
      method: route.method,
      path: route.path,
      config: route.config,
    });
  }

  private isSecurityEnabled = () => {
    return (
      this.server.plugins.xpack_main.info.isAvailable() &&
      this.server.plugins.xpack_main.info.feature('security').isEnabled()
    );
  };

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
        securityEnabled: true,
        licenseValid: false,
        message: `Your ${licenseType} license does not support Beats central management features. Please upgrade your license.`,
      };
    }

    // License is valid but not active, we go into a read-only mode.
    if (!isLicenseActive) {
      return {
        securityEnabled: true,
        licenseValid: false,
        message: `You cannot edit, create, or delete your Beats central management configurations because your ${licenseType} license has expired.`,
      };
    }

    // Security is not enabled in ES
    if (!isSecurityEnabled) {
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
