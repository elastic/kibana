/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const mlAnomalyThresholdAlertParams = schema.object({
  jobSelection: schema.object(
    {
      jobIds: schema.maybe(schema.arrayOf(schema.string())),
      groupIds: schema.maybe(schema.arrayOf(schema.string())),
    },
    {
      validate: (v) => {
        if (!v.jobIds?.length && !v.groupIds?.length) {
          return 'List of job ids or group ids is required';
        }
      },
    }
  ),
  severity: schema.number(),
  resultTypes: schema.arrayOf(schema.string()),
  timeRange: schema.string(),
});

export type MlAnomalyThresholdAlertParams = TypeOf<typeof mlAnomalyThresholdAlertParams>;
