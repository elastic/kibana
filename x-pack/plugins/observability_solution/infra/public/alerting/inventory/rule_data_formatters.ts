/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '@kbn/observability-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type {
  AssetDetailsLocatorParams,
  InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { SupportedAssetTypes } from '../../../common/asset_details/types';
import { getInventoryViewInAppUrl } from '../../../common/alerting/metrics/alert_link';

export const getFormatReason = ({
  assetDetailsLocator,
  inventoryLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  inventoryLocator?: LocatorPublic<InventoryLocatorParams>;
}): ObservabilityRuleTypeFormatter => {
  return ({ fields }) => {
    const reason = fields[ALERT_REASON] ?? '-';
    const nodeType = fields[ALERT_RULE_PARAMETERS]?.nodeType ?? '';

    const supportsAssetDetails = Object.values(SupportedAssetTypes).includes(
      nodeType as SupportedAssetTypes
    );
    const locator = supportsAssetDetails ? assetDetailsLocator : inventoryLocator;

    return {
      reason,
      link: getInventoryViewInAppUrl({ fields, locator }),
      hasBasePath: true,
    };
  };
};
