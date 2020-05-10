/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xAxisConfig, yAxisConfig, hideAxis } from './__tests__/fixtures/test_styles';
import { getFlotAxisConfig } from './plot/get_flot_axis_config';

describe('getFlotAxisConfig', () => {
  const columns = {
    x: { type: 'string', role: 'dimension', expression: 'project' },
    y: { type: 'date', role: 'dimension', expression: 'location' },
  };

  const ticks = {
    x: { hash: { product1: 2, product2: 1 }, counter: 3 },
    y: { hash: {}, counter: 0 },
  };

  describe('show', () => {
    it('hides the axis', () => {
      let config = getFlotAxisConfig('x', false, { columns, ticks });
      expect(Object.keys(config)).toHaveLength(1);
      expect(config).toHaveProperty('show', false);

      config = getFlotAxisConfig('y', false, { columns, ticks });
      expect(Object.keys(config)).toHaveLength(1);
      expect(config).toHaveProperty('show', false);
    });

    it('shows the axis', () => {
      expect(getFlotAxisConfig('x', true, { columns, ticks })).toHaveProperty('show', true);
      expect(getFlotAxisConfig('y', true, { columns, ticks })).toHaveProperty('show', true);
    });

    it('sets show using an AxisConfig', () => {
      let result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result).toHaveProperty('show', xAxisConfig.show);

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).toHaveProperty('show', yAxisConfig.show);

      result = getFlotAxisConfig('x', hideAxis, { columns, ticks });
      expect(result).toHaveProperty('show', hideAxis.show);

      result = getFlotAxisConfig('y', hideAxis, { columns, ticks });
      expect(result).toHaveProperty('show', hideAxis.show);
    });
  });

  describe('position', () => {
    it('sets the position of the axis when given an AxisConfig', () => {
      let result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result).toHaveProperty('position', xAxisConfig.position);

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).toHaveProperty('position', yAxisConfig.position);
    });

    it("defaults position to 'bottom' for the x-axis", () => {
      const invalidXPosition = {
        type: 'axisConfig',
        show: true,
        position: 'left',
      };

      const result = getFlotAxisConfig('x', invalidXPosition, { columns, ticks });
      expect(result).toHaveProperty('position', 'bottom');
    });

    it("defaults position to 'left' for the y-axis", () => {
      const invalidYPosition = {
        type: 'axisConfig',
        show: true,
        position: 'bottom',
      };

      const result = getFlotAxisConfig('y', invalidYPosition, { columns, ticks });
      expect(result).toHaveProperty('position', 'left');
    });
  });

  describe('ticks', () => {
    it('adds a tick mark mapping for string columns', () => {
      let result = getFlotAxisConfig('x', true, { columns, ticks });
      expect(result.ticks).toEqual([
        [2, 'product1'],
        [1, 'product2'],
      ]);

      result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result.ticks).toEqual([
        [2, 'product1'],
        [1, 'product2'],
      ]);
    });
  });

  describe('mode', () => {
    it('sets the mode to time for date columns', () => {
      let result = getFlotAxisConfig('y', true, { columns, ticks });
      expect(result).toHaveProperty('mode', 'time');

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).toHaveProperty('mode', 'time');
    });
  });
});
