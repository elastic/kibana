/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '..';
import { createEmailAction, defaultsFromConfig, optionsFromConfig } from './create_email_action';
import { EmailAction } from './email_action';

describe('create_email_action', () => {
  test('optionsFromConfig uses config without modification', () => {
    const get = (key: string) => {
      const suffixes = ['host', 'port', 'require_tls', 'pool', 'auth.username', 'auth.password'];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.email.smtp.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(optionsFromConfig({ get })).toEqual({
      host: 'host',
      port: 'port',
      requireTLS: 'require_tls',
      pool: 'pool',
      auth: {
        user: 'auth.username',
        pass: 'auth.password',
      },
    });
  });

  test('defaultsFromConfig uses config without modification', () => {
    const get = (key: string) => {
      const suffixes = ['from', 'to', 'cc', 'bcc'];
      const value = suffixes.find(suffix => {
        return `xpack.notifications.email.defaults.${suffix}` === key;
      });

      if (value === undefined) {
        throw new Error(`Unknown config key used ${key}`);
      }

      return value;
    };

    expect(defaultsFromConfig({ get })).toEqual({
      from: 'from',
      to: 'to',
      cc: 'cc',
      bcc: 'bcc',
    });
  });

  test('createEmailAction', async () => {
    const config = {};
    const testOptions = jest.fn().mockReturnValue({ options: true });
    const defaults = { defaults: true };
    const testDefaults = jest.fn().mockReturnValue(defaults);

    const server: ServerFacade = {
      log: jest.fn(),
      config: jest.fn().mockReturnValue(config),
      plugins: { xpack_main: { info: { license: { isNotBasic: () => true } } } },
    };

    const action = createEmailAction(server, { _options: testOptions, _defaults: testDefaults });

    expect(action instanceof EmailAction).toBe(true);

    expect(server.config).toHaveBeenCalledTimes(1);
    expect(server.config).toHaveBeenCalledWith();
    expect(testOptions).toHaveBeenCalledTimes(1);
    expect(testOptions).toHaveBeenCalledWith(config);
    expect(testDefaults).toHaveBeenCalledTimes(1);
    expect(testDefaults).toHaveBeenCalledWith(config);
  });
});
