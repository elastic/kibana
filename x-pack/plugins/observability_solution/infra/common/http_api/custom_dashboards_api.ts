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

const SavedObjectIdRT = rt.type({
  id: rt.string,
});

const InfraCustomDashboardRT = rt.intersection([AssetTypeRT, PayloadRT, SavedObjectIdRT]);

/**
 GET endpoint
*/
export const InfraGetCustomDashboardsRequestPathParamsRT = AssetTypeRT;
export const InfraGetCustomDashboardsResponseBodyRT = rt.array(InfraCustomDashboardRT);
export type InfraGetCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraGetCustomDashboardsResponseBodyRT
>;

/**
 * POST endpoint
 */
export const InfraSaveCustomDashboardsRequestPayloadRT = PayloadRT;
export const InfraSaveCustomDashboardsResponseBodyRT = InfraCustomDashboardRT;
export type InfraSaveCustomDashboardsRequestPayload = rt.TypeOf<
  typeof InfraSaveCustomDashboardsRequestPayloadRT
>;
export type InfraSaveCustomDashboardsResponseBody = rt.TypeOf<
  typeof InfraSaveCustomDashboardsResponseBodyRT
>;

/**
 * PUT endpoint
 */
export const InfraUpdateCustomDashboardsRequestPathParamsRT = rt.intersection([
  AssetTypeRT,
  SavedObjectIdRT,
]);

/**
 * DELETE endpoint
 */
export const InfraDeleteCustomDashboardsRequestParamsRT = rt.intersection([
  AssetTypeRT,
  SavedObjectIdRT,
]);
