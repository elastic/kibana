/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('cloudExperiments config', () => {
  describe.each([true, false])('when disabled (dev: %p)', (dev) => {
    const ctx = { dev };
    test('should default to `enabled:false` and the rest empty', () => {
      expect(config.schema.validate({}, ctx)).toStrictEqual({ enabled: false });
    });

    test('it should allow any additional config', () => {
      const cfg = {
        enabled: false,
        launch_darkly: {
          sdk_key: 'sdk-1234',
          client_id: '1234',
          client_log_level: 'none',
        },
        flag_overrides: {
          'my-plugin.my-feature-flag': 1234,
        },
      };
      expect(config.schema.validate(cfg, ctx)).toStrictEqual(cfg);
    });

    test('it should allow any additional config (missing flag_overrides)', () => {
      const cfg = {
        enabled: false,
        launch_darkly: {
          sdk_key: 'sdk-1234',
          client_id: '1234',
          client_log_level: 'none',
        },
      };
      expect(config.schema.validate(cfg, ctx)).toStrictEqual(cfg);
    });

    test('it should allow any additional config (missing launch_darkly)', () => {
      const cfg = {
        enabled: false,
        flag_overrides: {
          'my-plugin.my-feature-flag': 1234,
        },
      };
      expect(config.schema.validate(cfg, ctx)).toStrictEqual(cfg);
    });
  });

  describe('when enabled', () => {
    describe('in dev mode', () => {
      const ctx = { dev: true };
      test('in dev mode, it allows `launch_darkly` to be empty', () => {
        expect(
          config.schema.validate({ enabled: true, flag_overrides: { my_flag: 1 } }, ctx)
        ).toStrictEqual({
          enabled: true,
          flag_overrides: { my_flag: 1 },
        });
      });

      test('in dev mode, it allows `launch_darkly` and `flag_overrides` to be empty', () => {
        expect(config.schema.validate({ enabled: true }, ctx)).toStrictEqual({ enabled: true });
      });
    });

    describe('in prod (non-dev mode)', () => {
      const ctx = { dev: false };
      test('it enforces `launch_darkly` config if not in dev-mode', () => {
        expect(() =>
          config.schema.validate({ enabled: true }, ctx)
        ).toThrowErrorMatchingInlineSnapshot(
          `"[launch_darkly.sdk_key]: expected value of type [string] but got [undefined]"`
        );
      });

      test('in prod mode, it allows `flag_overrides` to be empty', () => {
        expect(
          config.schema.validate(
            {
              enabled: true,
              launch_darkly: {
                sdk_key: 'sdk-1234',
                client_id: '1234',
              },
            },
            ctx
          )
        ).toStrictEqual({
          enabled: true,
          launch_darkly: {
            sdk_key: 'sdk-1234',
            client_id: '1234',
            client_log_level: 'none',
          },
        });
      });

      test('in prod mode, it allows `flag_overrides` to be provided', () => {
        expect(
          config.schema.validate(
            {
              enabled: true,
              launch_darkly: {
                sdk_key: 'sdk-1234',
                client_id: '1234',
              },
              flag_overrides: {
                my_flag: 123,
              },
            },
            ctx
          )
        ).toStrictEqual({
          enabled: true,
          launch_darkly: {
            sdk_key: 'sdk-1234',
            client_id: '1234',
            client_log_level: 'none',
          },
          flag_overrides: {
            my_flag: 123,
          },
        });
      });
    });
  });
});
