/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RISK_CHART_CATEGORY,
  ALERTS_PAGE,
  STACK_BY_SETTING_NAME,
} from '../../../detections/pages/detection_engine/alerts_local_storage/constants';
import { getSettingKey, useDefaultWhenEmptyString } from './helpers';

describe('helpers', () => {
  describe('getSettingKey', () => {
    it('returns the expected key', () => {
      expect(
        getSettingKey({
          category: RISK_CHART_CATEGORY,
          page: ALERTS_PAGE,
          setting: STACK_BY_SETTING_NAME,
        })
      ).toEqual(`${ALERTS_PAGE}.${RISK_CHART_CATEGORY}.${STACK_BY_SETTING_NAME}`);
    });
  });

  describe('useDefaultWhenEmptyString', () => {
    it('returns true when value is empty', () => {
      expect(useDefaultWhenEmptyString('')).toBe(true);
    });

    it('returns false when value is non-empty', () => {
      expect(useDefaultWhenEmptyString('foozle')).toBe(false);
    });
  });
});
