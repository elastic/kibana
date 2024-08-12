/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '@kbn/observability-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import type { AssetDetailsLocatorParams } from '@kbn/observability-shared-plugin/common';
import { InventoryItemType, findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { SupportedAssetTypes } from '../../../common/asset_details/types';
import { getMetricsViewInAppUrl } from '../../../common/alerting/metrics/alert_link';

export const getFormatReason = ({
  assetDetailsLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
}): ObservabilityRuleTypeFormatter => {
  return ({ fields }) => {
    const reason = fields[ALERT_REASON] ?? '-';
    const groupBy = (fields[ALERT_RULE_PARAMETERS]?.groupBy as string[]) ?? [];

    const assetTypeByAssetId = Object.values(SupportedAssetTypes).reduce((acc, curr) => {
      acc[findInventoryModel(curr).fields.id] = curr;
      return acc;
    }, {} as Record<string, InventoryItemType>);

    const supportedAssetId = groupBy.find((field) => !!assetTypeByAssetId[field]);
    const assetType = supportedAssetId ? assetTypeByAssetId[supportedAssetId] : undefined;

    const locator = assetType ? assetDetailsLocator : undefined;

    return {
      reason,
      link: getMetricsViewInAppUrl({
        fields,
        assetDetailsLocator: locator,
        nodeType: assetType,
      }),
      hasBasePath: !!assetType,
    };
  };
};
