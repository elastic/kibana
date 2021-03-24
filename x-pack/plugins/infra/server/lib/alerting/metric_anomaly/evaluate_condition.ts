/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricAnomalyParams } from '../../../../common/alerting/metrics';
import { getMetricsHostsAnomalies, getMetricK8sAnomalies } from '../../infra_ml';
import { MlSystem, MlAnomalyDetectors } from '../../../types';

type ConditionParams = Omit<MetricAnomalyParams, 'alertInterval'> & {
  spaceId: string;
  startTime: number;
  endTime: number;
  mlSystem: MlSystem;
  mlAnomalyDetectors: MlAnomalyDetectors;
};

export const evaluateCondition = async ({
  nodeType,
  spaceId,
  sourceId,
  mlSystem,
  mlAnomalyDetectors,
  startTime,
  endTime,
  metric,
  threshold,
  influencerFilter,
}: ConditionParams) => {
  const getAnomalies = nodeType === 'k8s' ? getMetricK8sAnomalies : getMetricsHostsAnomalies;

  const result = await getAnomalies({
    context: {
      spaceId,
      mlSystem,
      mlAnomalyDetectors,
    },
    sourceId: sourceId ?? 'default',
    anomalyThreshold: threshold,
    startTime,
    endTime,
    metric,
    sort: { field: 'anomalyScore', direction: 'desc' },
    pagination: { pageSize: 100 },
    influencerFilter,
  });

  return result;
};
