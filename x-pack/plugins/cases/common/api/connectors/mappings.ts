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

const ConnectorMappingRt = rt.strict({
  action_type: ActionTypeRt,
  source: CaseFieldRt,
  target: ThirdPartyFieldRt,
});

export const ConnectorMappingsRt = rt.array(ConnectorMappingRt);

export const ConnectorMappingsAttributesRt = rt.strict({
  mappings: ConnectorMappingsRt,
  owner: rt.string,
});

export const ConnectorMappingsAttributesPartialRt = rt.exact(
  rt.partial(ConnectorMappingsAttributesRt.type.props)
);

export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRt>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;

export const ConnectorMappingResponseRt = rt.strict({
  id: rt.string,
  version: rt.string,
  mappings: ConnectorMappingsRt,
});

export type ConnectorMappingResponse = rt.TypeOf<typeof ConnectorMappingResponseRt>;
