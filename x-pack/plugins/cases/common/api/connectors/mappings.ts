/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

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

const ThirdPartyFieldRT = rt.union([rt.string, rt.literal('not_mapped')]);
export type ActionType = rt.TypeOf<typeof ActionTypeRT>;
export type CaseField = rt.TypeOf<typeof CaseFieldRT>;
export type ThirdPartyField = rt.TypeOf<typeof ThirdPartyFieldRT>;

export const ConnectorMappingsAttributesRT = rt.type({
  action_type: ActionTypeRT,
  source: CaseFieldRT,
  target: ThirdPartyFieldRT,
});

export const ConnectorMappingsRt = rt.type({
  mappings: rt.array(ConnectorMappingsAttributesRT),
  owner: rt.string,
});

export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRT>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;

const FieldTypeRT = rt.union([rt.literal('text'), rt.literal('textarea')]);

const ConnectorFieldRt = rt.type({
  id: rt.string,
  name: rt.string,
  required: rt.boolean,
  type: FieldTypeRT,
});

export type ConnectorField = rt.TypeOf<typeof ConnectorFieldRt>;

const GetDefaultMappingsResponseRt = rt.array(ConnectorMappingsAttributesRT);

export type GetDefaultMappingsResponse = rt.TypeOf<typeof GetDefaultMappingsResponseRt>;
