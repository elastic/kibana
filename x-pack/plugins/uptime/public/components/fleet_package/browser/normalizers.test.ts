/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../types';
import { getThrottlingParamNormalizer, isThrottlingEnabledNormalizer } from './normalizers';
import { defaultBrowserAdvancedFields } from '../contexts';

describe('browser normalizers', () => {
  const makeThrottlingConfig = (value: string) => ({
    [ConfigKey.THROTTLING_CONFIG]: { value },
  });

  describe('throttlingToParameterNormalizer', () => {
    it('can extract download values', () => {
      const fields = makeThrottlingConfig('10d/5u/2.5l');

      expect(getThrottlingParamNormalizer(ConfigKey.DOWNLOAD_SPEED)(fields)).toEqual('10');
    });

    it('can extract upload values', () => {
      const fields = makeThrottlingConfig('10d/5u/2.5l');

      expect(getThrottlingParamNormalizer(ConfigKey.UPLOAD_SPEED)(fields)).toEqual('5');
    });

    it('can extract latency values', () => {
      const fields = makeThrottlingConfig('10d/5u/2.5l');

      expect(getThrottlingParamNormalizer(ConfigKey.LATENCY)(fields)).toEqual('2.5');
    });

    it('returns default values when throttling is disabled', () => {
      const fields = makeThrottlingConfig('false');

      expect(getThrottlingParamNormalizer(ConfigKey.DOWNLOAD_SPEED)(fields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.DOWNLOAD_SPEED]
      );
      expect(getThrottlingParamNormalizer(ConfigKey.UPLOAD_SPEED)(fields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.UPLOAD_SPEED]
      );
      expect(getThrottlingParamNormalizer(ConfigKey.LATENCY)(fields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.LATENCY]
      );
    });

    it("returns default values when the desired suffix doesn't exist", () => {
      const noUploadFields = makeThrottlingConfig('10d/2.5l');
      expect(getThrottlingParamNormalizer(ConfigKey.UPLOAD_SPEED)(noUploadFields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.UPLOAD_SPEED]
      );

      const noDownloadFields = makeThrottlingConfig('10u/2.5l');
      expect(getThrottlingParamNormalizer(ConfigKey.DOWNLOAD_SPEED)(noDownloadFields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.DOWNLOAD_SPEED]
      );

      const noLatencyFields = makeThrottlingConfig('10d/5u');
      expect(getThrottlingParamNormalizer(ConfigKey.LATENCY)(noLatencyFields)).toEqual(
        defaultBrowserAdvancedFields[ConfigKey.LATENCY]
      );
    });
  });

  describe('isThrottlingEnabledNormalizer', () => {
    it('returns true for any value that is not "false"', () => {
      expect(isThrottlingEnabledNormalizer(makeThrottlingConfig('10d/2l'))).toEqual(true);
      expect(isThrottlingEnabledNormalizer(makeThrottlingConfig('test'))).toEqual(true);
    });

    it('returns false when throttling config is the string "false"', () => {
      expect(isThrottlingEnabledNormalizer(makeThrottlingConfig('false'))).toEqual(false);
    });
  });
});
