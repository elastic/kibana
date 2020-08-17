/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UiStatsMetricType } from '@kbn/analytics';

import {
  UIM_APP_NAME,
  UIM_CONFIG_COLD_PHASE,
  UIM_CONFIG_FREEZE_INDEX,
  UIM_CONFIG_SET_PRIORITY,
  UIM_CONFIG_WARM_PHASE,
} from '../constants/ui_metric';

import { Policy } from './policies/types';
import {
  defaultNewColdPhase,
  defaultNewHotPhase,
  defaultNewWarmPhase,
} from './policies/default_new_policy';

export let trackUiMetric = (metricType: UiStatsMetricType, eventName: string) => {};

export function init(usageCollection?: UsageCollectionSetup): void {
  if (usageCollection) {
    trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME);
  }
}

export function getUiMetricsForPhases(policy: Policy): any {
  const phaseUiMetrics = [
    {
      metric: UIM_CONFIG_COLD_PHASE,
      isTracked: () => Boolean(policy.phases.cold),
    },
    {
      metric: UIM_CONFIG_WARM_PHASE,
      isTracked: () => Boolean(policy.phases.warm),
    },
    {
      metric: UIM_CONFIG_SET_PRIORITY,
      isTracked: () => {
        // We only care about whether the user has interacted with the priority of *any* phase at all.
        // If the priority is different than the default, we'll consider it a user interaction,
        // even if the user has set it to undefined.
        return (
          policy.phases.hot.phaseIndexPriority !== defaultNewHotPhase.phaseIndexPriority ||
          policy.phases.warm.phaseIndexPriority !== defaultNewWarmPhase.phaseIndexPriority ||
          policy.phases.cold.phaseIndexPriority !== defaultNewColdPhase.phaseIndexPriority
        );
      },
    },
    {
      metric: UIM_CONFIG_FREEZE_INDEX,
      isTracked: () => policy.phases.cold && policy.phases.cold.freezeEnabled,
    },
  ];

  return phaseUiMetrics.reduce((tracked: any, { metric, isTracked }) => {
    if (isTracked()) {
      tracked.push(metric);
    }
    return tracked;
  }, []);
}
