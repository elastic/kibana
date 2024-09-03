/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { type AlertStatus } from '@kbn/rule-data-utils';

export type AssetDetailsLocator = LocatorPublic<AssetDetailsLocatorParams>;

export interface AssetDetailsLocatorParams extends SerializableRecord {
  assetType: string;
  assetId: string;
  // asset types not migrated to use the asset details page
  _a?: {
    time?: {
      from?: string;
      to?: string;
    };
    interval?: string;
  };
  assetDetails?: {
    tabId?: string;
    name?: string;
    dashboardId?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    alertMetric?: string;
    processSearch?: string;
    metadataSearch?: string;
    logsSearch?: string;
    profilingSearch?: string;
    alertStatus?: AlertStatus | 'all';
  };
}

export const ASSET_DETAILS_LOCATOR_ID = 'ASSET_DETAILS_LOCATOR';

export class AssetDetailsLocatorDefinition implements LocatorDefinition<AssetDetailsLocatorParams> {
  public readonly id = ASSET_DETAILS_LOCATOR_ID;

  public readonly getLocation = async (
    params: AssetDetailsLocatorParams & { state?: SerializableRecord }
  ) => {
    const legacyNodeDetailsQueryParams = rison.encodeUnknown(params._a);
    const assetDetailsQueryParams = rison.encodeUnknown(params.assetDetails);

    const queryParams = [];
    if (assetDetailsQueryParams !== undefined) {
      queryParams.push(`assetDetails=${assetDetailsQueryParams}`);
    }
    if (legacyNodeDetailsQueryParams !== undefined) {
      queryParams.push(`_a=${legacyNodeDetailsQueryParams}`);
    }

    return {
      app: 'metrics',
      path: `/detail/${params.assetType}/${params.assetId}?${queryParams.join('&')}`,
      state: params.state ? params.state : {},
    };
  };
}
