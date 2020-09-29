/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

import { JiraSettingFieldsRT } from './jira';
import { ResilientSettingFieldsRT } from './resilient';
import { ServiceNowSettingFieldsRT } from './servicenow';

export * from './jira';
export * from './servicenow';
export * from './resilient';

const ConnectorJiraFields = rt.type({ type: rt.literal('.jira'), ...JiraSettingFieldsRT.props });
const ConnectorResillientFields = rt.type({
  type: rt.literal('.resillient'),
  ...ResilientSettingFieldsRT.props,
});
const ConnectorServiceNowFields = rt.type({
  type: rt.literal('.serviceNow'),
  ...ServiceNowSettingFieldsRT.props,
});

export const ConnectorFieldsRt = rt.taggedUnion('type', [
  ConnectorJiraFields,
  ConnectorResillientFields,
  ConnectorServiceNowFields,
]);

export type ConnectorFields = rt.TypeOf<typeof ConnectorFieldsRt>;
