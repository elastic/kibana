/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { UserRt } from '../user';
import { CaseConnectorRt } from '../connectors/connector';
import { ConnectorMappingsRt } from '../connectors/mappings';

// TODO: we will need to add this type rt.literal('close-by-third-party')
const ClosureTypeRT = rt.union([rt.literal('close-by-user'), rt.literal('close-by-pushing')]);

const CasesConfigureBasicWithoutOwnerRt = rt.strict({
  /**
   * The external connector
   */
  connector: CaseConnectorRt,
  /**
   * Whether to close the case after it has been synced with the external system
   */
  closure_type: ClosureTypeRT,
});

const CasesConfigureBasicRt = rt.intersection([
  CasesConfigureBasicWithoutOwnerRt,
  rt.strict({
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.string,
  }),
]);

export const CasesConfigureRequestRt = CasesConfigureBasicRt;
export const CasesConfigurePatchRt = rt.intersection([
  rt.exact(rt.partial(CasesConfigureBasicWithoutOwnerRt.type.props)),
  rt.strict({ version: rt.string }),
]);

export const CaseConfigureAttributesRt = rt.intersection([
  CasesConfigureBasicRt,
  rt.strict({
    created_at: rt.string,
    created_by: UserRt,
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRt, rt.null]),
  }),
]);

export const CaseConfigureResponseRt = rt.intersection([
  CaseConfigureAttributesRt,
  ConnectorMappingsRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
    error: rt.union([rt.string, rt.null]),
    owner: rt.string,
  }),
]);

export const GetConfigureFindRequestRt = rt.exact(
  rt.partial({
    /**
     * The configuration plugin owner to filter the search by. If this is left empty the results will include all configurations
     * that the user has permissions to access
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const CaseConfigureRequestParamsRt = rt.strict({
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

export type GetConfigureFindRequest = rt.TypeOf<typeof GetConfigureFindRequestRt>;
