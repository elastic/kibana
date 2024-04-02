/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ItemTypeRT } from '@kbn/metrics-data-access-plugin/common';
import * as rt from 'io-ts';

const AssetTypeRT = rt.type({
  assetType: ItemTypeRT,
});

const PayloadRT = rt.type({
  dashboardSavedObjectId: rt.string,
  dashboardFilterAssetIdEnabled: rt.boolean,
});

const InfraCustomDashboardRT = rt.intersection([AssetTypeRT, PayloadRT]);

const dashboardSavedObjectIdRT = rt.type({
  dashboardSavedObjectId: rt.string,
});

/**
 GET endpoint
*/
export const InfraGetCustomDashboardsRequestParamsRT = AssetTypeRT;
export const InfraGetCustomDashboardsResponseBodyRT = rt.array(InfraCustomDashboardRT);
export type InfraGetCustomDashboardsRequestParams = rt.TypeOf<
  typeof InfraGetCustomDashboardsRequestParamsRT
>;
export type InfraGetCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraGetCustomDashboardsResponseBodyRT
>;

/**
 * POST endpoint
 */
export const InfraSaveCustomDashboardsRequestPayloadRT = PayloadRT;
export const InfraSaveCustomDashboardsResponseBodyRT = InfraCustomDashboardRT;
export type InfraSaveCustomDashboardsRequestPayload = rt.TypeOf<typeof PayloadRT>;
export type InfraSaveCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraSaveCustomDashboardsResponseBodyRT
>;

/**
 * DELETE endpoint
 */
export const InfraDeleteCustomDashboardsRequestParamsRT = rt.intersection([
  AssetTypeRT,
  dashboardSavedObjectIdRT,
]);
