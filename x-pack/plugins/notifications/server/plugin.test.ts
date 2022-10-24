/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { NotificationsConfigType } from './config';
import { NotificationsPlugin } from './plugin';

const missingConnectorConfig = {
  connectors: {
    default: {},
  },
};

const invalidConnectorConfig = {
  connectors: {
    default: {
      email: 'someUnexistingConnectorId',
    },
  },
};

const validConnectorConfig = {
  connectors: {
    default: {
      email: 'validConnectorId',
    },
  },
};

const createNotificationsPlugin = (config: NotificationsConfigType) => {
  const context = coreMock.createPluginInitializerContext<NotificationsConfigType>(config);
  const plugin = new NotificationsPlugin(context);
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  const actionsSetup = actionsMock.createSetup();
  actionsSetup.isPreconfiguredConnector.mockImplementationOnce(
    (connectorId) => connectorId === 'validConnectorId'
  );
  const pluginSetup = {
    actions: actionsSetup,
  };

  const actionsStart = actionsMock.createStart();
  const pluginStart = {
    actions: actionsStart,
  };

  return {
    context,
    logger: context.logger,
    plugin,
    coreSetup,
    coreStart,
    actionsSetup,
    pluginSetup,
    actionsStart,
    pluginStart,
  };
};

describe('Notifications Plugin', () => {
  describe('setup()', () => {
    it('should log warning if Actions plugin is not available', () => {
      const { plugin, logger, coreSetup } = createNotificationsPlugin({});
      plugin.setup(coreSetup, {});
      expect(logger.get().warn).toHaveBeenCalledWith(
        `Email Service Setup Error: 'actions' plugin not available.`
      );
    });

    it('should log warning if no default email connector has been defined', () => {
      const { plugin, logger, coreSetup } = createNotificationsPlugin(missingConnectorConfig);
      plugin.setup(coreSetup, {
        actions: actionsMock.createSetup(),
      });

      expect(logger.get().warn).toHaveBeenCalledWith(
        `Email Service Setup Error: Email connector not specified.`
      );
    });

    it('should log warning if the specified email connector is not a preconfigured connector', () => {
      const { plugin, logger, coreSetup, pluginSetup } =
        createNotificationsPlugin(invalidConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      expect(logger.get().warn).toHaveBeenCalledWith(
        `Email Service Setup Error: Unexisting email connector 'someUnexistingConnectorId' specified.`
      );
    });

    it('should not log warning if actions plugin is defined and the specified email connector is valid', () => {
      const { plugin, logger, coreSetup, pluginSetup } =
        createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      expect(logger.get().warn).not.toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    it('should not return an Email service if Actions plugin is not available', () => {
      const { plugin, coreSetup, coreStart } = createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, {});
      const { email } = plugin.start(coreStart, {});
      expect(email).toBe(undefined);
    });

    it('should not return an Email service if no default email connector has been defined', () => {
      const { plugin, coreSetup, pluginSetup, coreStart, pluginStart } =
        createNotificationsPlugin(missingConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(email).toBe(undefined);
    });

    it('should not return an Email service if the specified email connector is not a preconfigured connector', () => {
      const { plugin, coreSetup, pluginSetup, coreStart, pluginStart } =
        createNotificationsPlugin(invalidConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(email).toBe(undefined);
    });

    it('should return an Email service if actions plugin is defined and the specified email connector is valid', () => {
      const { plugin, coreSetup, pluginSetup, coreStart, pluginStart } =
        createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(email?.sendPlainTextEmail).toBeInstanceOf(Function);
    });
  });
});
