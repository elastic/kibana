/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnomaliesTable } from '../../../../pages/metrics/inventory_view/components/ml/anomaly_detection/anomalies_table/anomalies_table';

export interface AnomaliesProps {
  nodeName: string;
  onClose?: () => void;
}
export const Anomalies = ({ nodeName, onClose = () => {} }: AnomaliesProps) => {
  return <AnomaliesTable closeFlyout={onClose} hostName={nodeName} />;
};
