/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const ActionTypeRt = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);
const CaseFieldRt = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('comments'),
  rt.literal('tags'),
]);

const ThirdPartyFieldRt = rt.union([rt.string, rt.literal('not_mapped')]);
export type ActionType = rt.TypeOf<typeof ActionTypeRt>;
export type CaseField = rt.TypeOf<typeof CaseFieldRt>;
export type ThirdPartyField = rt.TypeOf<typeof ThirdPartyFieldRt>;

const ConnectorMappingsAttributesRt = rt.type({
  action_type: ActionTypeRt,
  source: CaseFieldRt,
  target: ThirdPartyFieldRt,
});

export const ConnectorMappingsRt = rt.type({
  mappings: rt.array(ConnectorMappingsAttributesRt),
  owner: rt.string,
});

export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRt>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;

const FieldTypeRt = rt.union([rt.literal('text'), rt.literal('textarea')]);

const ConnectorFieldRt = rt.type({
  id: rt.string,
  name: rt.string,
  required: rt.boolean,
  type: FieldTypeRt,
});

export type ConnectorField = rt.TypeOf<typeof ConnectorFieldRt>;

const GetDefaultMappingsResponseRt = rt.array(ConnectorMappingsAttributesRt);

export type GetDefaultMappingsResponse = rt.TypeOf<typeof GetDefaultMappingsResponseRt>;
