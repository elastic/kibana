/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnomaliesTable } from '../../../../pages/metrics/inventory_view/components/ml/anomaly_detection/anomalies_table/anomalies_table';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDateRangeProviderContext } from '../../hooks/use_date_range';

export const Anomalies = () => {
  const { dateRange } = useDateRangeProviderContext();
  const { asset, overrides } = useAssetDetailsRenderPropsContext();
  const { onClose = () => {} } = overrides?.anomalies ?? {};

  return (
    <AnomaliesTable
      closeFlyout={onClose}
      hostName={asset.name}
      dateRange={dateRange}
      hideDatePicker
    />
  );
};
