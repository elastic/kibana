/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from 'src/plugins/expressions/public';

import { checkTableForContainsSmallValues, shouldShowValuesInLegend } from './render_helpers';
import { PieLayerState, PieChartTypes } from '../../common';

describe('render helpers', () => {
  describe('#checkTableForContainsSmallValues', () => {
    let datatable: Datatable;
    const columnId = 'foo';

    beforeEach(() => {
      datatable = {
        rows: [],
      } as unknown as Datatable;
    });

    it('should return true if the data contains values less than the target percentage (1)', () => {
      datatable.rows = [
        {
          [columnId]: 80,
        },
        {
          [columnId]: 20,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeTruthy();
    });

    it('should return true if the data contains values less than the target percentage (42)', () => {
      datatable.rows = [
        {
          [columnId]: 58,
        },
        {
          [columnId]: 42,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 42)).toBeTruthy();
    });

    it('should return false if the data contains values greater than the target percentage', () => {
      datatable.rows = [
        {
          [columnId]: 22,
        },
        {
          [columnId]: 56,
        },
        {
          [columnId]: 12,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeFalsy();
    });
  });

  describe('#shouldShowValuesInLegend', () => {
    it('should firstly read the state value', () => {
      expect(
        shouldShowValuesInLegend(
          { showValuesInLegend: true } as PieLayerState,
          PieChartTypes.WAFFLE
        )
      ).toBeTruthy();

      expect(
        shouldShowValuesInLegend(
          { showValuesInLegend: false } as PieLayerState,
          PieChartTypes.WAFFLE
        )
      ).toBeFalsy();
    });

    it('should read value from meta in case of value in state is undefined', () => {
      expect(
        shouldShowValuesInLegend(
          { showValuesInLegend: undefined } as PieLayerState,
          PieChartTypes.WAFFLE
        )
      ).toBeTruthy();

      expect(shouldShowValuesInLegend({} as PieLayerState, PieChartTypes.WAFFLE)).toBeTruthy();

      expect(
        shouldShowValuesInLegend(
          { showValuesInLegend: undefined } as PieLayerState,
          PieChartTypes.PIE
        )
      ).toBeFalsy();
    });
  });
});
