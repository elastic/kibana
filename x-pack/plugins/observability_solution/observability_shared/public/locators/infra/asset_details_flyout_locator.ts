/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type AssetDetailsFlyoutLocator = LocatorPublic<AssetDetailsFlyoutLocatorParams>;

export interface AssetDetailsFlyoutLocatorParams extends SerializableRecord {
  tableProperties: {
    detailsItemId: string;
    pagination: {
      pageIndex: number;
      pageSize: number;
    };
    sorting: {
      direction?: string;
      field: string;
    };
  };
  assetDetails: {
    tabId?: string;
    dashboardId?: string;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export const ASSET_DETAILS_FLYOUT_LOCATOR_ID = 'ASSET_DETAILS_FLYOUT_LOCATOR';

export class AssetDetailsFlyoutLocatorDefinition
  implements LocatorDefinition<AssetDetailsFlyoutLocatorParams>
{
  public readonly id = ASSET_DETAILS_FLYOUT_LOCATOR_ID;

  public readonly getLocation = async (params: AssetDetailsFlyoutLocatorParams) => {
    const tableProperties = rison.encodeUnknown(params.tableProperties);
    const assetDetails = rison.encodeUnknown(params.assetDetails);
    return {
      app: 'metrics',
      path: `/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`,
      state: {},
    };
  };
}
