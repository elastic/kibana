/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { XYLegendValue } from '@kbn/visualizations-plugin/common';
import { nonNullable } from '../../utils';
import { shouldDisplayTable } from '../../shared_components/legend/legend_settings_popover';

const LEGEND_STATS_PREFIX = 'lens_legend_stats';
const constructName = (eventName: string) => `${LEGEND_STATS_PREFIX}${eventName}`;

export const getLegendStatsTelemetryEvents = (
  legendStats: XYLegendValue[] | undefined,
  prevLegendStats?: XYLegendValue[] | undefined
) => {
  if (!legendStats || !legendStats.length || isEqual(legendStats, prevLegendStats)) {
    return [];
  }
  if (!shouldDisplayTable(legendStats)) {
    return [];
  }
  const mainEvent = LEGEND_STATS_PREFIX;
  const typesEvents = legendStats.map((legendStat) => {
    return constructName(`_${legendStat}`);
  });
  const counterText = getRangeText(legendStats.length);
  const counterEvent = counterText ? constructName(counterText) : undefined;

  return [mainEvent, ...typesEvents, counterEvent].filter(nonNullable);
};

function getRangeText(n: number) {
  if (n < 1) {
    return;
  }
  if (n < 4) {
    return `_amount_${String(n)}`;
  }
  if (n >= 4 && n <= 7) {
    return '_amount_4_to_7';
  }
  if (n >= 8) {
    return '_amount_above_8';
  }
}
