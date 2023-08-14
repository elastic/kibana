/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnomaliesTable } from '../../../../pages/metrics/inventory_view/components/ml/anomaly_detection/anomalies_table/anomalies_table';
import { useAssetDetailsStateContext } from '../../hooks/use_asset_details_state';

export const Anomalies = () => {
  const { asset, overrides } = useAssetDetailsStateContext();
  const { onClose = () => {} } = overrides?.anomalies ?? {};

  return <AnomaliesTable closeFlyout={onClose} hostName={asset.name} />;
};
