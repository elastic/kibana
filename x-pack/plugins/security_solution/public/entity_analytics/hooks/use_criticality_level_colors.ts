/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import type { CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
// TODO: update these colors once severity color palette is available
export const useCriticalityLevelColors = (): Record<CriticalityLevelWithUnassigned, string> => {
  const { euiTheme } = useEuiTheme();
  return {
    extreme_impact: '#F66D64', // TODO change to euiTheme.colors.vis.euiColorVis6 when borealis is available,
    high_impact: euiTheme.colors.vis.euiColorVisWarm1,
    medium_impact: euiTheme.colors.vis.euiColorVis9,
    low_impact: euiTheme.colors.vis.euiColorVisSuccess0,
    unassigned: euiTheme.colors.vis.euiColorVisNeutral0, // TODO: this is a closest guess based on severity colors, change to grey20 when available
  };
};
