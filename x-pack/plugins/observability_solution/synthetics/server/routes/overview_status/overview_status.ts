/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath, { Unit } from '@kbn/datemath';
import { OverviewStatusService } from './overview_status_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { OverviewStatusState } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { OverviewStatusSchema } from '../common';

/**
 * Helper function that converts a monitor's schedule to a value to use to generate
 * an appropriate look-back window for snapshot count.
 * @param schedule a number/unit pair that represents how often a configured monitor runs
 * @returns schedule interval in ms
 */
export function periodToMs(schedule: { number: string; unit: Unit }) {
  if (Object.keys(datemath.unitsMap).indexOf(schedule.unit) === -1) return 0;

  return parseInt(schedule.number, 10) * datemath.unitsMap[schedule.unit].base;
}

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: OverviewStatusSchema,
  },
  handler: async (routeContext): Promise<OverviewStatusState> => {
    const statusOverview = new OverviewStatusService(routeContext);
    return await statusOverview.getOverviewStatus();
  },
});
