/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { AuditTrailPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';

import { securityMock } from '../../security/server/mocks';
import { spacesMock } from '../../spaces/server/mocks';

describe('AuditTrail plugin', () => {
  describe('#setup', () => {
    let plugin: AuditTrailPlugin;
    let pluginInitContextMock: ReturnType<typeof coreMock.createPluginInitializerContext>;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;

    const deps = {
      security: securityMock.createSetup(),
      spaces: spacesMock.createSetup(),
    };

    beforeEach(() => {
      pluginInitContextMock = coreMock.createPluginInitializerContext();
      plugin = new AuditTrailPlugin(pluginInitContextMock);
      coreSetup = coreMock.createSetup();
    });

    afterEach(async () => {
      await plugin.stop();
    });

    it('registers AuditTrail factory', async () => {
      pluginInitContextMock = coreMock.createPluginInitializerContext();
      plugin = new AuditTrailPlugin(pluginInitContextMock);
      plugin.setup(coreSetup, deps);
      expect(coreSetup.auditTrail.register).toHaveBeenCalledTimes(1);
    });

    describe('logger', () => {
      it('registers a custom logger', async () => {
        pluginInitContextMock = coreMock.createPluginInitializerContext();
        plugin = new AuditTrailPlugin(pluginInitContextMock);
        plugin.setup(coreSetup, deps);

        expect(coreSetup.logging.configure).toHaveBeenCalledTimes(1);
      });

      it('disables logging if config.logger.enabled: false', async () => {
        const config = {
          logger: {
            enabled: false,
          },
        };
        pluginInitContextMock = coreMock.createPluginInitializerContext(config);

        plugin = new AuditTrailPlugin(pluginInitContextMock);
        plugin.setup(coreSetup, deps);

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.loggers?.every((l) => l.level === 'off')).toBe(true);
      });
      it('logs with DEBUG level if config.logger.enabled: true', async () => {
        const config = {
          logger: {
            enabled: true,
          },
        };
        pluginInitContextMock = coreMock.createPluginInitializerContext(config);

        plugin = new AuditTrailPlugin(pluginInitContextMock);
        plugin.setup(coreSetup, deps);

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.loggers?.every((l) => l.level === 'debug')).toBe(true);
      });
      it('uses appender adjusted via config', async () => {
        const config = {
          appender: {
            kind: 'file',
            path: '/path/to/file.txt',
          },
          logger: {
            enabled: true,
          },
        };
        pluginInitContextMock = coreMock.createPluginInitializerContext(config);

        plugin = new AuditTrailPlugin(pluginInitContextMock);
        plugin.setup(coreSetup, deps);

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.appenders).toEqual({ auditTrailAppender: config.appender });
      });
      it('falls back to the default appender if not configured', async () => {
        const config = {
          logger: {
            enabled: true,
          },
        };
        pluginInitContextMock = coreMock.createPluginInitializerContext(config);

        plugin = new AuditTrailPlugin(pluginInitContextMock);
        plugin.setup(coreSetup, deps);

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.appenders).toEqual({
          auditTrailAppender: {
            kind: 'console',
            layout: {
              kind: 'pattern',
              highlight: true,
            },
          },
        });
      });
    });
  });
});
