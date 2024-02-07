/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const AssetTypeRT = rt.type({
  /**
   * For now we have only one asset type, so it's a literal type.
   * In the future it can be changed to a union type:
   * `rt.union([rt.literal('host'), rt.literal('container'), rt.literal('pod')])`
   */
  assetType: rt.literal('host'),
});

const CustomDashboardRT = rt.intersection([
  AssetTypeRT,
  rt.type({
    dashboardSavedObjectIdList: rt.array(rt.string),
  }),
  rt.partial({
    kuery: rt.string,
  }),
]);

/**
 GET endpoint
*/
export const InfraGetCustomDashboardsRequestParamsRT = AssetTypeRT;
export const InfraGetCustomDashboardsResponseBodyRT = CustomDashboardRT;
export type InfraGetCustomDashboardsRequestParams = rt.TypeOf<
  typeof InfraGetCustomDashboardsRequestParamsRT
>;
export type InfraGetCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraGetCustomDashboardsResponseBodyRT
>;

/**
 * POST endpoint
 */
export const InfraSaveCustomDashboardsRequestPayloadRT = CustomDashboardRT;
export const InfraSaveCustomDashboardsResponseBodyRT = CustomDashboardRT;
export type InfraSaveCustomDashboardsRequestPayload = rt.TypeOf<
  typeof InfraSaveCustomDashboardsRequestPayloadRT
>;
export type InfraSaveCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraSaveCustomDashboardsResponseBodyRT
>;
