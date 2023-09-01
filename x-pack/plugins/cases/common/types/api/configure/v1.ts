/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import type { Configurations, Configuration } from '../../domain/configure/v1';
import { ConfigurationBasicWithoutOwnerRt, CasesConfigureBasicRt } from '../../domain/configure/v1';

export const ConfigurationRequestRt = CasesConfigureBasicRt;

export const GetConfigurationFindRequestRt = rt.exact(
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

export const ConfigurationPatchRequestRt = rt.intersection([
  rt.exact(rt.partial(ConfigurationBasicWithoutOwnerRt.type.props)),
  rt.strict({ version: rt.string }),
]);

export type ConfigurationRequest = rt.TypeOf<typeof ConfigurationRequestRt>;
export type ConfigurationPatchRequest = rt.TypeOf<typeof ConfigurationPatchRequestRt>;
export type GetConfigurationFindRequest = rt.TypeOf<typeof GetConfigurationFindRequestRt>;
export type GetConfigureResponse = Configurations;
export type CreateConfigureResponse = Configuration;
export type UpdateConfigureResponse = Configuration;
