/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from './common/base';

// --------------------------------------------------
// Tests for this module are at:
// x-pack/plugins/security_solution/common/endpoint/schema/actions.test.ts:604
// --------------------------------------------------

export const KillProcessRouteRequestSchema = {
  body: schema.object(
    {
      ...BaseActionRequestSchema,
      parameters: schema.oneOf([
        schema.object({ pid: schema.number({ min: 1 }) }),
        schema.object({ entity_id: schema.string({ minLength: 1 }) }),

        // Process Name currently applies only to SentinelOne (validated below)
        schema.object({ process_name: schema.string({ minLength: 1 }) }),
      ]),
    },
    {
      validate(bodyContent) {
        if ('process_name' in bodyContent.parameters && bodyContent.agent_type !== 'sentinel_one') {
          return `[parameters.process_name]: is not valid with agent type of ${bodyContent.agent_type}`;
        }

        if (
          bodyContent.agent_type === 'sentinel_one' &&
          !('process_name' in bodyContent.parameters)
        ) {
          return `[parameters.process_name]: missing parameter for agent type of ${bodyContent.agent_type}`;
        }
      },
    }
  ),
};
