/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { NotificationsConfigType } from './config';
import { NotificationsPlugin } from './plugin';
import * as emailServiceFactory from './services/connectors_email_service_factory';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

const checkEmailServiceConfigurationSpy = jest.spyOn(
  emailServiceFactory,
  'checkEmailServiceConfiguration'
);

const getEmailServiceSpy = jest.spyOn(emailServiceFactory, 'getEmailService');

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
    licensing: licensingMock.createSetup(),
  };

  const actionsStart = actionsMock.createStart();
  const pluginStart = {
    actions: actionsStart,
    licensing: licensingMock.createStart(),
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
    beforeEach(() => checkEmailServiceConfigurationSpy.mockClear());

    it('should call checkEmailServiceConfiguration(), catch Exceptions and log a warn', () => {
      const { plugin, logger, coreSetup } = createNotificationsPlugin(validConnectorConfig);
      const pluginSetup = {
        actions: actionsMock.createSetup(),
      };
      plugin.setup(coreSetup, pluginSetup);
      expect(checkEmailServiceConfigurationSpy).toHaveBeenCalledTimes(1);
      expect(checkEmailServiceConfigurationSpy).toHaveBeenCalledWith({
        config: validConnectorConfig,
        plugins: pluginSetup,
      });
      expect(logger.get().warn).toHaveBeenCalledWith(
        `Email Service Setup Error: 'actions' and 'licensing' plugins are required.`
      );

      // eslint-disable-next-line dot-notation
      expect(plugin['emailServiceSetupSuccessful']).toEqual(false);
    });

    it('should pass the setup checks successfully and not log any warning if the configuration is correct', () => {
      const { plugin, logger, coreSetup, pluginSetup } =
        createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      expect(checkEmailServiceConfigurationSpy).toHaveBeenCalledTimes(1);
      expect(checkEmailServiceConfigurationSpy).toHaveBeenCalledWith({
        config: validConnectorConfig,
        plugins: pluginSetup,
      });
      expect(logger.get().warn).not.toHaveBeenCalled();

      // eslint-disable-next-line dot-notation
      expect(plugin['emailServiceSetupSuccessful']).toEqual(true);
    });
  });

  describe('start()', () => {
    beforeEach(() => getEmailServiceSpy.mockClear());

    it('should not call getEmailService() if the setup() has not been run', () => {
      const { plugin, coreStart, pluginStart } = createNotificationsPlugin(validConnectorConfig);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(getEmailServiceSpy).not.toHaveBeenCalled();
      expect(email).toBeUndefined();
    });

    it('should not call getEmailService() if setup() has failed', () => {
      const { plugin, coreSetup, pluginSetup, coreStart, pluginStart } =
        createNotificationsPlugin(invalidConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(getEmailServiceSpy).not.toHaveBeenCalled();
      expect(email).toBeUndefined();
    });

    it('should call getEmailService() if setup() was successful', () => {
      const { plugin, coreSetup, pluginSetup, coreStart, pluginStart } =
        createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      const { email } = plugin.start(coreStart, pluginStart);
      expect(getEmailServiceSpy).toHaveBeenCalledTimes(1);
      expect(getEmailServiceSpy).toHaveBeenCalledWith({
        config: validConnectorConfig,
        plugins: pluginStart,
        logger: expect.any(Object),
      });
      expect(email).toEqual(getEmailServiceSpy.mock.results[0].value);
      expect(email?.sendPlainTextEmail).toBeInstanceOf(Function);
    });
  });
});
