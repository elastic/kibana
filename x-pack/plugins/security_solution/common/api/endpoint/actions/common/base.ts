/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../endpoint/service/response_actions/constants';

export const AgentTypeSchemaLiteral = RESPONSE_ACTION_AGENT_TYPE.map((agentType) =>
  schema.literal(agentType)
);

export const agentTypesSchema = {
  schema: schema.oneOf(
    // @ts-expect-error TS2769: No overload matches this call
    AgentTypeSchemaLiteral
  ),
  options: {
    minSize: 1,
    maxSize: RESPONSE_ACTION_AGENT_TYPE.length,
  },
};

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
  agent_type: schema.maybe(
    schema.oneOf(
      // @ts-expect-error TS2769: No overload matches this call
      AgentTypeSchemaLiteral,
      { defaultValue: 'endpoint' }
    )
  ),
};

export const NoParametersRequestSchema = {
  body: schema.object({ ...BaseActionRequestSchema }),
};
export type BaseActionRequestBody = TypeOf<typeof NoParametersRequestSchema.body>;
