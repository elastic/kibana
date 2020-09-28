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

const ConnectorJiraFields = rt.type({ type: rt.literal('.jira'), ...JiraFieldsRT.props });
const ConnectorResillientFields = rt.type({
  type: rt.literal('.resillient'),
  ...ResilientFieldsRT.props,
});
const ConnectorServiceNowFields = rt.type({
  type: rt.literal('.serviceNow'),
  ...ServiceNowFieldsRT.props,
});

export const ConnectorTypesRt = rt.taggedUnion('type', [
  ConnectorJiraFields,
  ConnectorResillientFields,
  ConnectorServiceNowFields,
]);

export type ConnectorTypes = rt.TypeOf<typeof ConnectorTypesRt>;
