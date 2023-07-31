/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const BaseActionRequestSchema = {
  /** A list of endpoint IDs whose hosts will be isolated (Fleet Agent IDs will be retrieved for these) */
  endpoint_ids: schema.arrayOf(schema.string({ minLength: 1 }), {
    minSize: 1,
    validate: (endpointIds) => {
      if (endpointIds.map((v) => v.trim()).some((v) => !v.length)) {
        return 'endpoint_ids cannot contain empty strings';
      }
    },
  }),
  /** If defined, any case associated with the given IDs will be updated */
  alert_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1 }), {
      minSize: 1,
      validate: (alertIds) => {
        if (alertIds.map((v) => v.trim()).some((v) => !v.length)) {
          return 'alert_ids cannot contain empty strings';
        }
      },
    })
  ),
  /** Case IDs to be updated */
  case_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1 }), {
      minSize: 1,
      validate: (caseIds) => {
        if (caseIds.map((v) => v.trim()).some((v) => !v.length)) {
          return 'case_ids cannot contain empty strings';
        }
      },
    })
  ),
  comment: schema.maybe(schema.string()),
  parameters: schema.maybe(schema.object({})),
};

export const NoParametersRequestSchema = {
  body: schema.object({ ...BaseActionRequestSchema }),
};
export type BaseActionRequestBody = TypeOf<typeof NoParametersRequestSchema.body>;

export const KillOrSuspendProcessRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.oneOf([
      schema.object({ pid: schema.number({ min: 1 }) }),
      schema.object({ entity_id: schema.string({ minLength: 1 }) }),
    ]),
  }),
};
