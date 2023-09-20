/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseConnectorRt, ConnectorMappingsRt } from '../connector/v1';
import { UserRt } from '../user/v1';

const ClosureTypeRt = rt.union([rt.literal('close-by-user'), rt.literal('close-by-pushing')]);

export const ConfigurationBasicWithoutOwnerRt = rt.strict({
  /**
   * The external connector
   */
  connector: CaseConnectorRt,
  /**
   * Whether to close the case after it has been synced with the external system
   */
  closure_type: ClosureTypeRt,
});

export const CasesConfigureBasicRt = rt.intersection([
  ConfigurationBasicWithoutOwnerRt,
  rt.strict({
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.string,
  }),
]);

export const ConfigurationActivityFieldsRt = rt.strict({
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
  rt.strict({
    id: rt.string,
    version: rt.string,
    error: rt.union([rt.string, rt.null]),
    owner: rt.string,
    mappings: ConnectorMappingsRt,
  }),
]);

export const ConfigurationsRt = rt.array(ConfigurationRt);

export type ClosureType = rt.TypeOf<typeof ClosureTypeRt>;
export type ConfigurationAttributes = rt.TypeOf<typeof ConfigurationAttributesRt>;
export type Configuration = rt.TypeOf<typeof ConfigurationRt>;
export type Configurations = rt.TypeOf<typeof ConfigurationsRt>;
