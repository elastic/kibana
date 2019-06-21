/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { useAnomaliesTableData } from '../rest/results/use_anomalies_table_data';
import { InfluencerInput, Anomalies } from '../types/anomalies';

interface ChildrenArgs {
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
}

interface Props {
  influencers: InfluencerInput[] | null;
  startDate: number;
  endDate: number;
  children: (args: ChildrenArgs) => React.ReactNode;
}

export const AnomalyTableProvider = React.memo<Props>(
  ({ influencers, startDate, endDate, children }) => {
    const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
      influencers,
      startDate,
      endDate,
    });
    return <>{children({ isLoadingAnomaliesData, anomaliesData })}</>;
  }
);
