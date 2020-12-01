/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * TODO:
 * IMPORTANT: Please see how {@link BreadcrumbService} is set up for an example of how these services should be set up
 * in future. The pattern in this file is legacy and should be updated to conform to the plugin lifecycle.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UiStatsMetricType } from '@kbn/analytics';

import {
  UIM_APP_NAME,
  UIM_CONFIG_COLD_PHASE,
  UIM_CONFIG_FREEZE_INDEX,
  UIM_CONFIG_SET_PRIORITY,
  UIM_CONFIG_WARM_PHASE,
  defaultSetPriority,
  defaultPhaseIndexPriority,
} from '../constants';

import { Phases } from '../../../common/types';

export let trackUiMetric = (metricType: UiStatsMetricType, eventName: string | string[]) => {};

export function init(usageCollection?: UsageCollectionSetup): void {
  if (usageCollection) {
    trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME);
  }
}

export function getUiMetricsForPhases(phases: Phases): string[] {
  const phaseUiMetrics = [
    {
      metric: UIM_CONFIG_COLD_PHASE,
      isTracked: () => Boolean(phases.cold),
    },
    {
      metric: UIM_CONFIG_WARM_PHASE,
      isTracked: () => Boolean(phases.warm),
    },
    {
      metric: UIM_CONFIG_SET_PRIORITY,
      isTracked: () => {
        // We only care about whether the user has interacted with the priority of *any* phase at all.
        const isHotPhasePriorityChanged =
          phases.hot &&
          phases.hot.actions.set_priority &&
          phases.hot.actions.set_priority.priority !== parseInt(defaultSetPriority, 10);

        const isWarmPhasePriorityChanged =
          phases.warm &&
          phases.warm.actions.set_priority &&
          phases.warm.actions.set_priority.priority !== parseInt(defaultPhaseIndexPriority, 10);

        const isColdPhasePriorityChanged =
          phases.cold &&
          phases.cold.actions.set_priority &&
          phases.cold.actions.set_priority.priority !== parseInt(defaultPhaseIndexPriority, 10);
        // If the priority is different than the default, we'll consider it a user interaction,
        // even if the user has set it to undefined.
        return (
          isHotPhasePriorityChanged || isWarmPhasePriorityChanged || isColdPhasePriorityChanged
        );
      },
    },
    {
      metric: UIM_CONFIG_FREEZE_INDEX,
      isTracked: () => phases.cold && phases.cold.actions.freeze,
    },
  ];

  return phaseUiMetrics.reduce((tracked: string[], { metric, isTracked }) => {
    if (isTracked()) {
      tracked.push(metric);
    }
    return tracked;
  }, []);
}
