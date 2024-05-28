/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYLegendValue } from '@kbn/visualizations-plugin/common';
import { getLegendStatsTelemetryEvents } from './legend_stats_telemetry_helpers';

describe('legend_stats_telemetry_helpers', () => {
  it('no events if legend stats are not defined', () => {
    expect(getLegendStatsTelemetryEvents(undefined)).toEqual([]);
  });
  it('ignores single CurrentAndLastValue stat as it does not trigger table view', () => {
    expect(getLegendStatsTelemetryEvents([XYLegendValue.CurrentAndLastValue])).toEqual([]);
    expect(
      getLegendStatsTelemetryEvents([XYLegendValue.CurrentAndLastValue, XYLegendValue.Average])
    ).toEqual([
      'lens_legend_stats',
      'lens_legend_stats_currentAndLastValue',
      'lens_legend_stats_average',
      'lens_legend_stats_amount_2',
    ]);
  });

  it('no events if no changes made in color mapping', () => {
    expect(getLegendStatsTelemetryEvents([XYLegendValue.Average], [XYLegendValue.Average])).toEqual(
      []
    );
    expect(
      getLegendStatsTelemetryEvents(
        [XYLegendValue.CurrentAndLastValue, XYLegendValue.Average],
        [XYLegendValue.CurrentAndLastValue, XYLegendValue.Average]
      )
    ).toEqual([]);
  });
  describe('calculates counter events properly', () => {
    it('returns single count event', () => {
      expect(getLegendStatsTelemetryEvents([XYLegendValue.Average])).toEqual([
        'lens_legend_stats',
        'lens_legend_stats_average',
        'lens_legend_stats_amount_1',
      ]);
    });
    it('returns 2 count event', () => {
      expect(getLegendStatsTelemetryEvents([XYLegendValue.Average, XYLegendValue.Count])).toEqual([
        'lens_legend_stats',
        'lens_legend_stats_average',
        'lens_legend_stats_count',
        'lens_legend_stats_amount_2',
      ]);
    });
    it('returns 3 count event', () => {
      expect(
        getLegendStatsTelemetryEvents([
          XYLegendValue.Average,
          XYLegendValue.Count,
          XYLegendValue.CurrentAndLastValue,
        ])
      ).toEqual([
        'lens_legend_stats',
        'lens_legend_stats_average',
        'lens_legend_stats_count',
        'lens_legend_stats_currentAndLastValue',
        'lens_legend_stats_amount_3',
      ]);
    });
    it('returns 4 count event', () => {
      expect(
        getLegendStatsTelemetryEvents([
          XYLegendValue.CurrentAndLastValue,
          XYLegendValue.Max,
          XYLegendValue.Min,
          XYLegendValue.Average,
        ])
      ).toEqual([
        'lens_legend_stats',
        'lens_legend_stats_currentAndLastValue',
        'lens_legend_stats_max',
        'lens_legend_stats_min',
        'lens_legend_stats_average',
        'lens_legend_stats_amount_4_to_7',
      ]);
    });

    it('returns >8 count event', () => {
      expect(
        getLegendStatsTelemetryEvents([
          XYLegendValue.CurrentAndLastValue,
          XYLegendValue.Max,
          XYLegendValue.Min,
          XYLegendValue.Average,
          XYLegendValue.Count,
          XYLegendValue.Total,
          XYLegendValue.LastValue,
          XYLegendValue.FirstValue,
          XYLegendValue.Median,
        ])
      ).toEqual([
        'lens_legend_stats',
        'lens_legend_stats_currentAndLastValue',
        'lens_legend_stats_max',
        'lens_legend_stats_min',
        'lens_legend_stats_average',
        'lens_legend_stats_count',
        'lens_legend_stats_total',
        'lens_legend_stats_lastValue',
        'lens_legend_stats_firstValue',
        'lens_legend_stats_median',
        'lens_legend_stats_amount_above_8',
      ]);
    });
  });
});
