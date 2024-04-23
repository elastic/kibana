/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type AssetDetailsLocator = LocatorPublic<AssetDetailsLocatorParams>;

export interface AssetDetailsLocatorParams extends SerializableRecord {
  assetType: string;
  assetId: string;
  _a?: {
    time?: {
      from: string;
      to: string;
    };
    interval?: string;
  };
  assetDetails?: {
    tabId?: string;
    dashboardId?: string;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export const ASSET_DETAILS_LOCATOR_ID = 'ASSET_DETAILS_LOCATOR';

export class AssetDetailsLocatorDefinition implements LocatorDefinition<AssetDetailsLocatorParams> {
  public readonly id = ASSET_DETAILS_LOCATOR_ID;

  public readonly getLocation = async (params: AssetDetailsLocatorParams) => {
    const searchPath = rison.encodeUnknown(params._a);
    const assetDetails = rison.encodeUnknown(params.assetDetails);
    return {
      app: 'metrics',
      path: `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=${searchPath}`,
      state: {},
    };
  };
}
