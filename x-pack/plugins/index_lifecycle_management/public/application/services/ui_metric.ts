/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { UiStatsMetricType } from '@kbn/analytics';

import {
  UIM_APP_NAME,
  UIM_CONFIG_COLD_PHASE,
  UIM_CONFIG_WARM_PHASE,
  UIM_CONFIG_SET_PRIORITY,
  UIM_CONFIG_FREEZE_INDEX,
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_INDEX_PRIORITY,
} from '../constants';

import { defaultColdPhase, defaultWarmPhase, defaultHotPhase } from '../store/defaults';

export let trackUiMetric = (metricType: UiStatsMetricType, eventName: string) => {};

export function init(usageCollection?: UsageCollectionSetup): void {
  if (usageCollection) {
    trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, UIM_APP_NAME);
  }
}

export function getUiMetricsForPhases(phases: any): any {
  const phaseUiMetrics = [
    {
      metric: UIM_CONFIG_COLD_PHASE,
      isTracked: () => Boolean(phases[PHASE_COLD]),
    },
    {
      metric: UIM_CONFIG_WARM_PHASE,
      isTracked: () => Boolean(phases[PHASE_WARM]),
    },
    {
      metric: UIM_CONFIG_SET_PRIORITY,
      isTracked: () => {
        const phaseToDefaultIndexPriorityMap = {
          [PHASE_HOT]: defaultHotPhase[PHASE_INDEX_PRIORITY],
          [PHASE_WARM]: defaultWarmPhase[PHASE_INDEX_PRIORITY],
          [PHASE_COLD]: defaultColdPhase[PHASE_INDEX_PRIORITY],
        };

        // We only care about whether the user has interacted with the priority of *any* phase at all.
        return [PHASE_HOT, PHASE_WARM, PHASE_COLD].some((phase) => {
          // If the priority is different than the default, we'll consider it a user interaction,
          // even if the user has set it to undefined.
          return (
            phases[phase] &&
            get(phases[phase], 'actions.set_priority.priority') !==
              phaseToDefaultIndexPriorityMap[phase]
          );
        });
      },
    },
    {
      metric: UIM_CONFIG_FREEZE_INDEX,
      isTracked: () => phases[PHASE_COLD] && get(phases[PHASE_COLD], 'actions.freeze'),
    },
  ];

  const trackedUiMetrics = phaseUiMetrics.reduce((tracked: any, { metric, isTracked }) => {
    if (isTracked()) {
      tracked.push(metric);
    }
    return tracked;
  }, []);

  return trackedUiMetrics;
}
