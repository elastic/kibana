/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { ActionResult } from '../../../../actions/common';
import { UserRT } from '../user';
// import { JiraCaseFieldsRt } from '../connectors/jira';
// import { ServiceNowCaseFieldsRT } from '../connectors/servicenow';
// import { ResilientCaseFieldsRT } from '../connectors/resilient';
import { CaseConnectorRt, ESCaseConnector } from '../connectors';

export type ActionConnector = ActionResult;

// TODO: we will need to add this type rt.literal('close-by-third-party')
const ClosureTypeRT = rt.union([rt.literal('close-by-user'), rt.literal('close-by-pushing')]);

const CasesConfigureBasicRt = rt.type({
  connector: CaseConnectorRt,
  closure_type: ClosureTypeRT,
});

export const CasesConfigureRequestRt = CasesConfigureBasicRt;
export const CasesConfigurePatchRt = rt.intersection([
  rt.partial(CasesConfigureBasicRt.props),
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
  rt.type({
    version: rt.string,
  }),
]);

export type ClosureType = rt.TypeOf<typeof ClosureTypeRT>;
export type CasesConfigure = rt.TypeOf<typeof CasesConfigureBasicRt>;
export type CasesConfigureRequest = rt.TypeOf<typeof CasesConfigureRequestRt>;
export type CasesConfigurePatch = rt.TypeOf<typeof CasesConfigurePatchRt>;
export type CasesConfigureAttributes = rt.TypeOf<typeof CaseConfigureAttributesRt>;
export type CasesConfigureResponse = rt.TypeOf<typeof CaseConfigureResponseRt>;

export type ESCasesConfigureAttributes = Omit<CasesConfigureAttributes, 'connector'> & {
  connector: ESCaseConnector;
};
const FieldTypeRT = rt.union([rt.literal('text'), rt.literal('textarea')]);

const FieldRt = rt.type({
  id: rt.string,
  name: rt.string,
  required: rt.boolean,
  type: FieldTypeRT,
});

export const FieldResponseRt = rt.array(FieldRt);
export type FieldResponse = rt.TypeOf<typeof FieldResponseRt>;
