/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import { legendConfig, LegendConfig } from './xy_expression';

describe('xy_expression', () => {
  describe('legendConfig', () => {
    it('produces the correct arguments', () => {
      const arg: LegendConfig = {
        isVisible: true,
        position: Position.Left,
      };

      expect(legendConfig.fn(null, arg)).toEqual({
        type: 'legendConfig',
        ...arg,
      });
    });
  });
});
