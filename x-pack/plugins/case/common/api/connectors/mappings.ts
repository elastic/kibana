/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
// import { JiraCaseFieldsRt, ResilientCaseFieldsRT, ServiceNowCaseFieldsRT } from '../connectors';

const ActionTypeRT = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);

const CaseFieldRT = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('comments'),
]);

const ThirdPartyFieldRT = rt.union([
  // JiraCaseFieldsRt,
  // ServiceNowCaseFieldsRT,
  // ResilientCaseFieldsRT,
  rt.string,
  rt.literal('not_mapped'),
]);

export type ActionType = rt.TypeOf<typeof ActionTypeRT>;
export type CaseField = rt.TypeOf<typeof CaseFieldRT>;
export type ThirdPartyField = rt.TypeOf<typeof ThirdPartyFieldRT>;

export const ConnectorMappingsAttributesRT = rt.type({
  source: CaseFieldRT,
  target: ThirdPartyFieldRT,
  action_type: ActionTypeRT,
});

export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRT>;

export interface ConnectorMappings {
  mappings: ConnectorMappingsAttributes[];
}
