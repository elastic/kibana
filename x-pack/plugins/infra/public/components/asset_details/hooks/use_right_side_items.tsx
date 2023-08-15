/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { APM_FIELD } from '../constants';
import { LinkToAlertsRule, LinkToApmServices, LinkToNodeDetails, LinkToUptime } from '../links';
import type { LinkOptions } from '../types';
import { toTimestampRange } from '../utils';
import { useAssetDetailsStateContext } from './use_asset_details_state';
import { useDateRangeProviderContext } from './use_date_range_provider';

export const useRighSideItems = (
  links?: LinkOptions[]
): { components: JSX.Element[] | undefined } => {
  const { dateRange } = useDateRangeProviderContext();
  const { asset, assetType, overrides } = useAssetDetailsStateContext();

  const topCornerLinkComponents: Record<LinkOptions, JSX.Element> = useMemo(
    () => ({
      nodeDetails: (
        <LinkToNodeDetails
          assetName={asset.name}
          assetType={assetType}
          currentTimestamp={toTimestampRange(dateRange).to}
        />
      ),
      alertRule: <LinkToAlertsRule onClick={overrides?.alertRule?.onCreateRuleClick} />,
      apmServices: <LinkToApmServices assetName={asset.name} apmField={APM_FIELD} />,
      uptime: <LinkToUptime assetName={asset.name} assetType={assetType} ip={asset.ip} />,
    }),
    [asset.ip, asset.name, assetType, dateRange, overrides?.alertRule?.onCreateRuleClick]
  );

  return { components: links?.map((link) => topCornerLinkComponents[link]) };
};
