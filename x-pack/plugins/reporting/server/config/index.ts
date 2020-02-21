/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n/';
import { TypeOf } from '@kbn/config-schema';
import crypto from 'crypto';
import { map } from 'rxjs/operators';
import { PluginConfigDescriptor } from 'kibana/server';
import { CoreSetup, Logger, PluginInitializerContext } from '../../../../../src/core/server';
import { ConfigSchema, ConfigType } from './schema';

export function createConfig$(core: CoreSetup, context: PluginInitializerContext, logger: Logger) {
  return context.config.create<TypeOf<typeof ConfigSchema>>().pipe(
    map(config => {
      let encryptionKey = config.encryptionKey;
      if (encryptionKey === undefined) {
        logger.warn(
          i18n.translate('xpack.reporting.serverConfig.randomEncryptionKey', {
            defaultMessage:
              'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on ' +
              'restart, please set xpack.reporting.encryptionKey in kibana.yml',
          })
        );
        encryptionKey = crypto.randomBytes(16).toString('hex');
      }

      const { kibanaServer: reportingServer } = config;
      const serverInfo = core.http.getServerInfo();

      // kibanaServer.hostname, default to server.host
      let kibanaServerHostname = reportingServer.hostname
        ? reportingServer.hostname
        : serverInfo.host;

      // don't allow "0"
      if (kibanaServerHostname === '0') {
        logger.warn(
          i18n.translate('xpack.reporting.serverConfig.invalidServerHostname', {
            defaultMessage:
              `Found 'server.host: "0"' in Kibana configuration. This is incompatible with Reporting. ` +
              `To enable Reporting to work, '{configKey}: 0.0.0.0' is being automatically to the configuration. ` +
              `You can change the setting to 'server.host: 0.0.0.0' or add '{configKey}: 0.0.0.0' in kibana.yml to prevent this message.`,
            values: { configKey: 'xpack.reporting.kibanaServer.hostname' },
          })
        );
        kibanaServerHostname = crypto.randomBytes(16).toString('hex');
      }

      // kibanaServer.port, default to server.port
      const kibanaServerPort = reportingServer.port
        ? reportingServer.port
        : serverInfo.port; // prettier-ignore

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
    })
  );
}

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('capture.browser.chromium.maxScreenshotDimension'),
    unused('capture.concurrency'),
    unused('capture.settleTime'),
    unused('capture.timeout'),
    unused('kibanaApp'),
  ],
};

export { ConfigSchema, ConfigType };
