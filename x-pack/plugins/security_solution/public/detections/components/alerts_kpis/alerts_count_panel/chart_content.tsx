/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { VisualizationEmbeddableProps } from '../../../../common/components/visualization_actions/types';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { AlertsCount } from './alerts_count';
import type { AlertsCountAggregation } from './types';

type ChartContentProps = {
  isChartEmbeddablesEnabled: boolean;
} & VisualizationEmbeddableProps & {
    isLoadingAlerts: boolean;
    alertsData: AlertSearchResponse<unknown, AlertsCountAggregation> | null;
    stackByField0: string;
    stackByField1: string | undefined;
  };

const ChartContentComponent = ({
  alertsData,
  extraActions,
  extraOptions,
  getLensAttributes,
  height,
  id,
  inspectTitle,
  isChartEmbeddablesEnabled,
  isLoadingAlerts,
  scopeId,
  stackByField0,
  stackByField1,
  timerange,
}: ChartContentProps) => {
  return isChartEmbeddablesEnabled ? (
    <VisualizationEmbeddable
      data-test-subj="embeddable-alerts-count"
      extraActions={extraActions}
      extraOptions={extraOptions}
      getLensAttributes={getLensAttributes}
      height={height}
      id={id}
      inspectTitle={inspectTitle}
      scopeId={scopeId}
      stackByField={stackByField0}
      timerange={timerange}
    />
  ) : alertsData != null ? (
    <AlertsCount
      data={alertsData}
      loading={isLoadingAlerts}
      stackByField0={stackByField0}
      stackByField1={stackByField1}
    />
  ) : null;
};

export const ChartContent = React.memo(ChartContentComponent);
