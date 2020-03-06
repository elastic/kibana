/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

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
