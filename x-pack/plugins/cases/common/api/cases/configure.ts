/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { UserRT } from '../user';
import { CaseConnectorRt, ConnectorMappingsRt, ESCaseConnector } from '../connectors';
import { OmitProp } from '../runtime_types';
import { OWNER_FIELD } from './constants';

// TODO: we will need to add this type rt.literal('close-by-third-party')
const ClosureTypeRT = rt.union([rt.literal('close-by-user'), rt.literal('close-by-pushing')]);

const CasesConfigureBasicRt = rt.type({
  connector: CaseConnectorRt,
  closure_type: ClosureTypeRT,
  [OWNER_FIELD]: rt.string,
});

const CasesConfigureBasicWithoutOwnerRt = rt.type(
  OmitProp(CasesConfigureBasicRt.props, OWNER_FIELD)
);

export const CasesConfigureRequestRt = CasesConfigureBasicRt;
export const CasesConfigurePatchRt = rt.intersection([
  rt.partial(CasesConfigureBasicWithoutOwnerRt.props),
  rt.type({ version: rt.string }),
]);

export const CaseConfigureAttributesRt = rt.intersection([
  CasesConfigureBasicRt,
  rt.type({
    created_at: rt.string,
    created_by: UserRT,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
  }),
]);

export const CaseConfigureResponseRt = rt.intersection([
  CaseConfigureAttributesRt,
  ConnectorMappingsRt,
  rt.type({
    id: rt.string,
    version: rt.string,
    error: rt.union([rt.string, rt.null]),
    [OWNER_FIELD]: rt.string,
  }),
]);

export const GetConfigureFindRequestRt = rt.partial({
  [OWNER_FIELD]: rt.union([rt.array(rt.string), rt.string]),
});

export const CaseConfigureRequestParamsRt = rt.type({
  configuration_id: rt.string,
});

export const CaseConfigurationsResponseRt = rt.array(CaseConfigureResponseRt);

export type ClosureType = rt.TypeOf<typeof ClosureTypeRT>;
export type CasesConfigure = rt.TypeOf<typeof CasesConfigureBasicRt>;
export type CasesConfigureRequest = rt.TypeOf<typeof CasesConfigureRequestRt>;
export type CasesConfigurePatch = rt.TypeOf<typeof CasesConfigurePatchRt>;
export type CasesConfigureAttributes = rt.TypeOf<typeof CaseConfigureAttributesRt>;
export type CasesConfigureResponse = rt.TypeOf<typeof CaseConfigureResponseRt>;
export type CasesConfigurationsResponse = rt.TypeOf<typeof CaseConfigurationsResponseRt>;

export type ESCasesConfigureAttributes = Omit<CasesConfigureAttributes, 'connector'> & {
  connector: ESCaseConnector;
};

export type GetConfigureFindRequest = rt.TypeOf<typeof GetConfigureFindRequestRt>;
