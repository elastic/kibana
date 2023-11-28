/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: fix the odd TS error
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  RESPONSE_ACTION_TYPE,
} from '../../../endpoint/service/response_actions/constants';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../endpoint/constants';

const commandsSchema = schema.oneOf(
  // @ts-expect-error TS2769: No overload matches this call
  RESPONSE_ACTION_API_COMMANDS_NAMES.map((command) => schema.literal(command))
);

// TODO: fix the odd TS error
// @ts-expect-error TS2769: No overload matches this call
const statusesSchema = schema.oneOf(RESPONSE_ACTION_STATUS.map((status) => schema.literal(status)));
// @ts-expect-error TS2769: No overload matches this call
const typesSchema = schema.oneOf(RESPONSE_ACTION_TYPE.map((type) => schema.literal(type)));

export const EndpointActionListRequestSchema = {
  query: schema.object({
    agentIds: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        schema.string({ minLength: 1 }),
      ])
    ),
    commands: schema.maybe(
      schema.oneOf([schema.arrayOf(commandsSchema, { minSize: 1 }), commandsSchema])
    ),
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    pageSize: schema.maybe(
      schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 10000 })
    ),
    startDate: schema.maybe(schema.string()), // date ISO strings or moment date
    endDate: schema.maybe(schema.string()), // date ISO strings or moment date
    statuses: schema.maybe(
      schema.oneOf([schema.arrayOf(statusesSchema, { minSize: 1, maxSize: 3 }), statusesSchema])
    ),
    userIds: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        schema.string({ minLength: 1 }),
      ])
    ),
    withOutputs: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), {
          minSize: 1,
          validate: (actionIds) => {
            if (actionIds.map((v) => v.trim()).some((v) => !v.length)) {
              return 'actionIds cannot contain empty strings';
            }
          },
        }),
        schema.string({
          minLength: 1,
          validate: (actionId) => {
            if (!actionId.trim().length) {
              return 'actionId cannot be an empty string';
            }
          },
        }),
      ])
    ),
    types: schema.maybe(
      schema.oneOf([schema.arrayOf(typesSchema, { minSize: 1, maxSize: 2 }), typesSchema])
    ),
  }),
};

export type EndpointActionListRequestQuery = TypeOf<typeof EndpointActionListRequestSchema.query>;
