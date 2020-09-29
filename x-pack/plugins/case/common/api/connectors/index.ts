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

// const ConnectorJiraFields = rt.type({ type: rt.literal(‘.jira’), ...JiraFieldsRT.props });
// const ConnectorResillientFields = rt.type({
//   type: rt.literal(‘.resillient’),
// ...ResilientFieldsRT.props,
// });
// const ConnectorServiceNowFields = rt.type({
//   type: rt.literal(‘.serviceNow’),
// ...ServiceNowFieldsRT.props,
// });

const ConnectorJiraTypeFieldsRt = rt.type({
  type: rt.literal('.jira'),
  fields: rt.union([JiraFieldsRT, rt.null]),
});
export type ConnectorJiraTypeFields = rt.TypeOf<typeof ConnectorJiraTypeFieldsRt>;
const ConnectorResillientTypeFieldsRt = rt.type({
  type: rt.literal('.resillient'),
  fields: rt.union([ResilientFieldsRT, rt.null]),
});
export type ConnectorResillientTypeFields = rt.TypeOf<typeof ConnectorResillientTypeFieldsRt>;
const ConnectorServiceNowTypeFieldsRt = rt.type({
  type: rt.literal('.serviceNow'),
  fields: rt.union([ServiceNowFieldsRT, rt.null]),
});
export type ConnectorServiceNowTypeFields = rt.TypeOf<typeof ConnectorServiceNowTypeFieldsRt>;
const ConnectorNoneTypeFieldsRt = rt.type({
  type: rt.literal('.none'),
  fields: rt.null,
});
export type ConnectorNoneTypeFields = rt.TypeOf<typeof ConnectorNoneTypeFieldsRt>;
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
