/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const incidentSchema = schema.object({
  result: schema.object({
    sys_id: schema.string(),
    number: schema.string(),
    sys_created_on: schema.string(),
    sys_updated_on: schema.string(),
  }),
});

export const applicationInformationSchema = schema.object({
  result: schema.object({
    name: schema.string(),
    scope: schema.string(),
    version: schema.string(),
  }),
});

export const importSetTableSuccessResponse = schema.object({
  import_set: schema.string(),
  staging_table: schema.string(),
  result: schema.arrayOf(
    schema.object({
      display_name: schema.string(),
      display_value: schema.string(),
      record_link: schema.string(),
      status: schema.string(),
      sys_id: schema.string(),
      table: schema.string(),
      transform_map: schema.string(),
    })
  ),
});

export const importSetTableErrorResponse = schema.object({
  import_set: schema.string(),
  staging_table: schema.string(),
  result: schema.arrayOf(
    schema.object({
      error_message: schema.string(),
      status_message: schema.string(),
      status: schema.string(),
      transform_map: schema.string(),
    })
  ),
});

export const importSetTableORIncidentTableResponse = schema.oneOf([
  importSetTableSuccessResponse,
  importSetTableErrorResponse,
  incidentSchema,
]);

export type ServiceNowResponse = TypeOf<typeof importSetTableORIncidentTableResponse>;
export type ServiceNowTableAPIResponse = TypeOf<typeof incidentSchema>;
export type ServiceNowImportSetAPIErrorResponse = TypeOf<typeof importSetTableErrorResponse>;
export type ServiceNowImportSetAPISuccessResponse = TypeOf<typeof importSetTableSuccessResponse>;
export type ServiceNowImportSetAPIResponse =
  | TypeOf<typeof importSetTableSuccessResponse>
  | TypeOf<typeof importSetTableErrorResponse>;
