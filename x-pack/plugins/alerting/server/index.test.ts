/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { config } from './index';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { set } from '@elastic/safer-lodash-set';

const CONFIG_PATH = 'xpack.alerting';
const applyStackAlertDeprecations = (_config: Record<string, unknown> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  // const _config = {};
  // set(_config, configPath, settings);
  const { config: migrated, changedPaths } = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
    changedPaths,
  };
};

describe('index', () => {
  describe('deprecations', () => {
    it('should deprecate .enabled flag', () => {
      const { messages } = applyStackAlertDeprecations({ [CONFIG_PATH]: { enabled: false } });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"xpack.alerting.enabled\\" is deprecated. The ability to disable this plugin will be removed in 8.0.0.",
        ]
      `);
    });

    it('should perform a custom set on deprecated and removed configs', () => {
      jest.spyOn(configDeprecationFactory, 'renameFromRoot');

      const customConfig = {};
      set(customConfig, 'xpack.alerts', {
        healthCheck: { interval: '30m' },
        invalidateApiKeysTask: { interval: '30m', removalDelay: '1d' },
      });
      const { changedPaths } = applyStackAlertDeprecations(customConfig);
      expect(configDeprecationFactory.renameFromRoot).toHaveBeenCalledTimes(3);
      expect((configDeprecationFactory.renameFromRoot as jest.Mock).mock.calls[0]).toEqual([
        'xpack.alerts.healthCheck.interval',
        'xpack.alerting.healthCheck.interval',
      ]);
      expect((configDeprecationFactory.renameFromRoot as jest.Mock).mock.calls[1]).toEqual([
        'xpack.alerts.invalidateApiKeysTask.interval',
        'xpack.alerting.invalidateApiKeysTask.interval',
      ]);
      expect((configDeprecationFactory.renameFromRoot as jest.Mock).mock.calls[2]).toEqual([
        'xpack.alerts.invalidateApiKeysTask.removalDelay',
        'xpack.alerting.invalidateApiKeysTask.removalDelay',
      ]);
      expect(changedPaths).toStrictEqual({
        set: [
          'xpack.alerting.healthCheck.interval',
          'xpack.alerting.legacyTrackingPurposes.healthCheck.interval',
          'xpack.alerting.invalidateApiKeysTask.interval',
          'xpack.alerting.legacyTrackingPurposes.invalidateApiKeysTask.interval',
          'xpack.alerting.invalidateApiKeysTask.removalDelay',
          'xpack.alerting.legacyTrackingPurposes.invalidateApiKeysTask.removalDelay',
        ],
        unset: [
          'xpack.alerts.healthCheck.interval',
          'xpack.alerts.invalidateApiKeysTask.interval',
          'xpack.alerts.invalidateApiKeysTask.removalDelay',
        ],
      });
    });
  });
});
