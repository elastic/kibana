/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseConnectorRt } from '../connectors/connector';
import { ConnectorMappingsRt } from '../connectors/mappings';

import { UserRt } from '../user';

const ClosureTypeRt = rt.union([rt.literal('close-by-user'), rt.literal('close-by-pushing')]);

export const ConfigurationBasicWithoutOwnerRt = rt.type({
  /**
   * The external connector
   */
  connector: CaseConnectorRt,
  /**
   * Whether to close the case after it has been synced with the external system
   */
  closure_type: ClosureTypeRt,
});

const CasesConfigureBasicRt = rt.intersection([
  ConfigurationBasicWithoutOwnerRt,
  rt.type({
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.string,
  }),
]);

export const ConfigurationRequestRt = CasesConfigureBasicRt;
export const ConfigurationPatchRequestRt = rt.intersection([
  rt.partial(ConfigurationBasicWithoutOwnerRt.props),
  rt.type({ version: rt.string }),
]);

export const ConfigurationActivityFieldsRt = rt.type({
  created_at: rt.string,
  created_by: UserRt,
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
});

export const ConfigurationAttributesRt = rt.intersection([
  CasesConfigureBasicRt,
  ConfigurationActivityFieldsRt,
]);

export const ConfigurationRt = rt.intersection([
  ConfigurationAttributesRt,
  ConnectorMappingsRt,
  rt.type({
    id: rt.string,
    version: rt.string,
    error: rt.union([rt.string, rt.null]),
    owner: rt.string,
  }),
]);

export const GetConfigurationFindRequestRt = rt.partial({
  /**
   * The configuration plugin owner to filter the search by. If this is left empty the results will include all configurations
   * that the user has permissions to access
   */
  owner: rt.union([rt.array(rt.string), rt.string]),
});

export const CaseConfigureRequestParamsRt = rt.type({
  configuration_id: rt.string,
});

export const ConfigurationsRt = rt.array(ConfigurationRt);

export type ClosureType = rt.TypeOf<typeof ClosureTypeRt>;
export type ConfigurationRequest = rt.TypeOf<typeof ConfigurationRequestRt>;
export type ConfigurationPatchRequest = rt.TypeOf<typeof ConfigurationPatchRequestRt>;
export type ConfigurationAttributes = rt.TypeOf<typeof ConfigurationAttributesRt>;
export type Configuration = rt.TypeOf<typeof ConfigurationRt>;
export type Configurations = rt.TypeOf<typeof ConfigurationsRt>;

export type GetConfigurationFindRequest = rt.TypeOf<typeof GetConfigurationFindRequestRt>;
