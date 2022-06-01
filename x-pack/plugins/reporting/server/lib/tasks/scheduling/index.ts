/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ReportTaskParams, ScheduledReportTaskParams } from '..';

export { getNextRun } from './get_next_run';

export const ScheduleReportFromJobParams = schema.object({
  post_url: schema.string(), // POST URL copied from Kibana share panel
  interval: schema.oneOf([
    schema.object({ minutes: schema.number({ min: 1 }) }),
    schema.object({ hours: schema.number({ min: 1 }) }),
    schema.object({ days: schema.number({ min: 1 }) }),
  ]),
});

export type ScheduleIntervalSchemaType = TypeOf<typeof ScheduleReportFromJobParams>['interval'];

export function isScheduled(
  task: ReportTaskParams | ScheduledReportTaskParams
): task is ScheduledReportTaskParams {
  return (
    (task as ReportTaskParams).id == null && (task as ScheduledReportTaskParams).interval != null
  );
}
