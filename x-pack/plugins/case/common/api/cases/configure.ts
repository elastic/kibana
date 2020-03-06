/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { ActionResult } from '../../../../actions/common';
import { UserRT } from '../user';

/*
 * This types below are related to the service now configuration
 * mapping between our case and service-now
 *
 */

const ActionTypeRT = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);

export const CasesConfigurationMapsRT = rt.type({
  source: rt.string,
  target: rt.string,
  actionType: ActionTypeRT,
});

export const CasesConfigurationRT = rt.type({
  mapping: rt.array(CasesConfigurationMapsRT),
});

export const CasesConnectorConfigurationRT = rt.type({
  cases_configuration: CasesConfigurationRT,
  version: rt.string,
});

export type CasesConfigurationMaps = rt.TypeOf<typeof CasesConfigurationMapsRT>;
export type CasesConfiguration = rt.TypeOf<typeof CasesConfigurationRT>;
export type CasesConnectorConfiguration = rt.TypeOf<typeof CasesConnectorConfigurationRT>;

/** ********************************************************************** */

export type Connector = ActionResult;

export interface CasesConnectorsFindResult {
  page: number;
  perPage: number;
  total: number;
  data: Connector[];
}

const CasesConfigureBasicRt = rt.type({
  connector_id: rt.string,
  closure_type: rt.union([
    rt.literal('close-by-user'),
    rt.literal('close-by-pushing'),
    // rt.literal('close-by-thrid-party'),
  ]),
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

export type CasesConfigureRequest = rt.TypeOf<typeof CasesConfigureRequestRt>;
export type CasesConfigurePatch = rt.TypeOf<typeof CasesConfigurePatchRt>;
export type CasesConfigureAttributes = rt.TypeOf<typeof CaseConfigureAttributesRt>;
export type CasesConfigureResponse = rt.TypeOf<typeof CaseConfigureResponseRt>;
