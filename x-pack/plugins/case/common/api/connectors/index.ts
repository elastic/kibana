/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

import { JiraFieldsRT } from './jira';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowFieldsRT } from './servicenow';

export * from './jira';
export * from './servicenow';
export * from './resilient';

export const ConnectorFieldsRt = rt.union([
  JiraFieldsRT,
  ResilientFieldsRT,
  ServiceNowFieldsRT,
  rt.null,
]);

const ConnectorJiraTypeFieldsRt = rt.type({
  type: rt.literal('.jira'),
  fields: rt.union([JiraFieldsRT, rt.null]),
});

const ConnectorResillientTypeFieldsRt = rt.type({
  type: rt.literal('.resillient'),
  fields: rt.union([ResilientFieldsRT, rt.null]),
});

const ConnectorServiceNowTypeFieldsRt = rt.type({
  type: rt.literal('.serviceNow'),
  fields: rt.union([ServiceNowFieldsRT, rt.null]),
});

const ConnectorNoneTypeFieldsRt = rt.type({
  type: rt.literal('.none'),
  fields: rt.null,
});

export const ConnectorTypeFieldsRt = rt.union([
  ConnectorJiraTypeFieldsRt,
  ConnectorNoneTypeFieldsRt,
  ConnectorResillientTypeFieldsRt,
  ConnectorServiceNowTypeFieldsRt,
]);

export type ConnectorTypeFields = rt.TypeOf<typeof ConnectorTypeFieldsRt>;

// we need to change these types back and forth for storing in ES (arrays overwrite, objects merge)
export type ConnectorFields = rt.TypeOf<typeof ConnectorFieldsRt>;
export type ESConnectorFields = Array<{
  key: string;
  value: unknown;
}>;
