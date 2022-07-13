/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { range } from 'lodash';
import { RuleType } from '@kbn/alerting-plugin/server';
import {
  DEFAULT_INSTANCES_TO_GENERATE,
  ALERTING_EXAMPLE_APP_ID,
  AlwaysFiringParams,
  AlwaysFiringActionGroupIds,
} from '../../common';

type ActionGroups = 'small' | 'medium' | 'large';
const DEFAULT_ACTION_GROUP: ActionGroups = 'small';

function getTShirtSizeByIdAndThreshold(
  id: string,
  thresholds: AlwaysFiringParams['thresholds']
): ActionGroups {
  const idAsNumber = parseInt(id, 10);
  if (!isNaN(idAsNumber)) {
    if (thresholds?.large && thresholds.large < idAsNumber) {
      return 'large';
    }
    if (thresholds?.medium && thresholds.medium < idAsNumber) {
      return 'medium';
    }
    if (thresholds?.small && thresholds.small < idAsNumber) {
      return 'small';
    }
  }
  return DEFAULT_ACTION_GROUP;
}

export const alertType: RuleType<
  AlwaysFiringParams,
  never,
  { count?: number; instancesToRetains?: Array<{ id: string; ttl: number }> },
  { triggerdOnCycle: number },
  { ttl: number },
  AlwaysFiringActionGroupIds
> = {
  id: '.always-firing',
  name: 'Always firing',
  actionGroups: [
    { id: 'small', name: 'Small t-shirt' },
    { id: 'medium', name: 'Medium t-shirt' },
    { id: 'large', name: 'Large t-shirt' },
  ],
  defaultActionGroupId: DEFAULT_ACTION_GROUP,
  minimumLicenseRequired: 'basic',
  isExportable: true,
  async executor({
    services,
    params: {
      instances = DEFAULT_INSTANCES_TO_GENERATE,
      thresholds,
      shouldFlapp = false,
      shouldPersist = false,
    },
    state,
  }) {
    const count = (state.count ?? 0) + 1;
    const activeAlerts = shouldPersist ? state.instancesToRetains ?? [] : [];

    if (activeAlerts.length < instances) {
      range(instances - activeAlerts.length)
        .map(() => uuid.v4())
        .forEach((id: string) => {
          activeAlerts.push({ id, ttl: shouldPersist ? Math.floor(Math.random() * 100) : 0 });
        });
    }

    const instancesToRetains = activeAlerts
      .map(({ id, ttl }) => {
        if (!shouldFlapp || ttl % 3 === 0 || ttl % 5 === 0) {
          services.alertFactory
            .create(id)
            .replaceState({ triggerdOnCycle: count })
            .scheduleActions(getTShirtSizeByIdAndThreshold(id, thresholds), { ttl });
        }
        return {
          id,
          ttl: ttl - 1,
        };
      })
      .filter((alert) => alert.ttl > 0);

    return {
      count,
      instancesToRetains,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
