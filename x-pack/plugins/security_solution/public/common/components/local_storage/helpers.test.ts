/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TREEMAP_CATEGORY,
  ALERTS_PAGE,
  STACK_BY_SETTING_NAME,
} from '../../../detections/components/alerts_kpis/chart_panels/alerts_local_storage/constants';
import { getSettingKey, isDefaultWhenEmptyString } from './helpers';

describe('helpers', () => {
  describe('getSettingKey', () => {
    it('returns the expected key', () => {
      expect(
        getSettingKey({
          category: TREEMAP_CATEGORY,
          page: ALERTS_PAGE,
          setting: STACK_BY_SETTING_NAME,
        })
      ).toEqual(`${ALERTS_PAGE}.${TREEMAP_CATEGORY}.${STACK_BY_SETTING_NAME}`);
    });
  });

  describe('isDefaultWhenEmptyString', () => {
    it('returns true when value is empty', () => {
      expect(isDefaultWhenEmptyString('')).toBe(true);
    });

    it('returns false when value is non-empty', () => {
      expect(isDefaultWhenEmptyString('foozle')).toBe(false);
    });
  });
});
