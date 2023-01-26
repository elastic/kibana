/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../constants';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
} from '../service/response_actions/constants';

const BaseActionRequestSchema = {
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
  alert_ids: schema.maybe(schema.arrayOf(schema.string())),
  /** Case IDs to be updated */
  case_ids: schema.maybe(schema.arrayOf(schema.string())),
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

export const ResponseActionBodySchema = schema.oneOf([
  NoParametersRequestSchema.body,
  KillOrSuspendProcessRequestSchema.body,
]);

export const EndpointActionLogRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1, min: 1 }),
    page_size: schema.number({ defaultValue: 10, min: 1, max: 100 }),
    start_date: schema.string(),
    end_date: schema.string(),
  }),
  params: schema.object({
    agent_id: schema.string(),
  }),
};

export type EndpointActionLogRequestParams = TypeOf<typeof EndpointActionLogRequestSchema.params>;
export type EndpointActionLogRequestQuery = TypeOf<typeof EndpointActionLogRequestSchema.query>;

export const ActionStatusRequestSchema = {
  query: schema.object({
    agent_ids: schema.oneOf([
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1, maxSize: 50 }),
      schema.string({ minLength: 1 }),
    ]),
  }),
};

export const ActionDetailsRequestSchema = {
  params: schema.object({
    action_id: schema.string(),
  }),
};

// TODO: fix the odd TS error
const commandsSchema = schema.oneOf(
  // @ts-expect-error TS2769: No overload matches this call
  RESPONSE_ACTION_API_COMMANDS_NAMES.map((command) => schema.literal(command))
);

// TODO: fix the odd TS error
// @ts-expect-error TS2769: No overload matches this call
const statusesSchema = schema.oneOf(RESPONSE_ACTION_STATUS.map((status) => schema.literal(status)));

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
  }),
};

export type EndpointActionListRequestQuery = TypeOf<typeof EndpointActionListRequestSchema.query>;

export const EndpointActionGetFileSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,

    parameters: schema.object({
      path: schema.string({ minLength: 1 }),
    }),
  }),
};

export type ResponseActionGetFileRequestBody = TypeOf<typeof EndpointActionGetFileSchema.body>;

/** Schema that validates the file download API */
export const EndpointActionFileDownloadSchema = {
  params: schema.object({
    action_id: schema.string({ minLength: 1 }),
    file_id: schema.string({ minLength: 1 }),
  }),
};

export type EndpointActionFileDownloadParams = TypeOf<
  typeof EndpointActionFileDownloadSchema.params
>;

/** Schema that validates the file info API */
export const EndpointActionFileInfoSchema = {
  params: schema.object({
    action_id: schema.string({ minLength: 1 }),
    file_id: schema.string({ minLength: 1 }),
  }),
};

export type EndpointActionFileInfoParams = TypeOf<typeof EndpointActionFileInfoSchema.params>;

export const ExecuteActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.object({
      command: schema.string({
        minLength: 1,
        validate: (value) => {
          if (!value.trim().length) {
            return 'command cannot be an empty string';
          }
        },
      }),
      timeout: schema.maybe(schema.number({ min: 1 })),
    }),
  }),
};
