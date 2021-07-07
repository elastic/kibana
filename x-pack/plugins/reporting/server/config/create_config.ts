/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n/';
import crypto from 'crypto';
import { upperFirst } from 'lodash';
import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { CoreSetup } from 'src/core/server';
import { LevelLogger } from '../lib';
import { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';
import { ReportingConfigType } from './schema';

/*
 * Set up dynamic config defaults
 * - xpack.capture.browser.chromium.disableSandbox
 * - xpack.kibanaServer
 * - xpack.reporting.encryptionKey
 */
export function createConfig$(
  core: CoreSetup,
  config$: Observable<ReportingConfigType>,
  parentLogger: LevelLogger
) {
  const logger = parentLogger.clone(['config']);
  return config$.pipe(
    map((config) => {
      // encryption key
      let encryptionKey = config.encryptionKey;
      if (encryptionKey === undefined) {
        logger.warn(
          i18n.translate('xpack.reporting.serverConfig.randomEncryptionKey', {
            defaultMessage:
              'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on ' +
              'restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.',
          })
        );
        encryptionKey = crypto.randomBytes(16).toString('hex');
      }
      const { kibanaServer: reportingServer } = config;
      const serverInfo = core.http.getServerInfo();
      // kibanaServer.hostname, default to server.host
      const kibanaServerHostname = reportingServer.hostname
        ? reportingServer.hostname
        : serverInfo.hostname;
      // kibanaServer.port, default to server.port
      const kibanaServerPort = reportingServer.port ? reportingServer.port : serverInfo.port;
      // kibanaServer.protocol, default to server.protocol
      const kibanaServerProtocol = reportingServer.protocol
        ? reportingServer.protocol
        : serverInfo.protocol;
      return {
        ...config,
        encryptionKey,
        kibanaServer: {
          hostname: kibanaServerHostname,
          port: kibanaServerPort,
          protocol: kibanaServerProtocol,
        },
      };
    }),
    mergeMap(async (config) => {
      if (config.capture.browser.chromium.disableSandbox != null) {
        // disableSandbox was set by user
        return config;
      }

      // disableSandbox was not set by user, apply default for OS
      const { os, disableSandbox } = await getDefaultChromiumSandboxDisabled();
      const osName = [os.os, os.dist, os.release].filter(Boolean).map(upperFirst).join(' ');

      logger.debug(
        i18n.translate('xpack.reporting.serverConfig.osDetected', {
          defaultMessage: `Running on OS: '{osName}'`,
          values: { osName },
        })
      );

      if (disableSandbox === true) {
        logger.warn(
          i18n.translate('xpack.reporting.serverConfig.autoSet.sandboxDisabled', {
            defaultMessage: `Chromium sandbox provides an additional layer of protection, but is not supported for {osName} OS. Automatically setting '{configKey}: true'.`,
            values: {
              configKey: 'xpack.reporting.capture.browser.chromium.disableSandbox',
              osName,
            },
          })
        );
      } else {
        logger.info(
          i18n.translate('xpack.reporting.serverConfig.autoSet.sandboxEnabled', {
            defaultMessage: `Chromium sandbox provides an additional layer of protection, and is supported for {osName} OS. Automatically enabling Chromium sandbox.`,
            values: { osName },
          })
        );
      }

      return {
        ...config,
        capture: {
          ...config.capture,
          browser: {
            ...config.capture.browser,
            chromium: { ...config.capture.browser.chromium, disableSandbox },
          },
        },
      };
    })
  );
}
