/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Dispatch, SetStateAction } from 'react';
import AssetDetails from '../../../../../components/asset_details/asset_details';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';
import { orderedFlyoutTabs } from './flyout_tabs';

interface Props {
  assetName: string;
  closeFlyout: () => void;
  setIsAlertFlyoutVisible: Dispatch<SetStateAction<boolean>>;
}

export const AssetDetailsFlyout = ({ assetName, closeFlyout, setIsAlertFlyoutVisible }: Props) => {
  const { source } = useSourceContext();
  const { currentTimeRange } = useWaffleTimeContext();
  const currentDateRange = {
    from: new Date(currentTimeRange.from).toISOString(),
    to: new Date(currentTimeRange.to).toISOString(),
  };

  return source ? (
    <AssetDetails
      asset={{ id: assetName, name: assetName }}
      assetType="host"
      overrides={{
        metadata: {
          showActionsColumn: false,
        },
        alertRule: {
          onCreateRuleClick: () => setIsAlertFlyoutVisible(true),
          inventoryRuleLabel: i18n.translate('xpack.infra.infra.nodeDetails.createAlertLink', {
            defaultMessage: 'Create inventory rule',
          }),
        },
      }}
      tabs={orderedFlyoutTabs}
      links={['alertRule', 'nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      metricAlias={source.configuration.metricAlias}
      dateRange={currentDateRange}
    />
  ) : null;
};
