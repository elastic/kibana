/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@kbn/datemath';
import { countBy } from 'lodash';
import { MappedAnomalyHit } from '../../infra_ml';
import { MlSystem, MlAnomalyDetectors } from '../../../types';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';
import {
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
  isTooManyBucketsPreviewException,
} from '../../../../common/alerting/metrics';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { evaluateCondition } from './evaluate_condition';

interface PreviewMetricAnomalyAlertParams {
  mlSystem: MlSystem;
  mlAnomalyDetectors: MlAnomalyDetectors;
  spaceId: string;
  params: MetricAnomalyParams;
  sourceId: string;
  lookback: Unit;
  alertInterval: string;
  alertThrottle: string;
  alertOnNoData: boolean;
  alertNotifyWhen: string;
}

export const previewMetricAnomalyAlert = async ({
  mlSystem,
  mlAnomalyDetectors,
  spaceId,
  params,
  sourceId,
  lookback,
  alertInterval,
  alertThrottle,
  alertNotifyWhen,
}: PreviewMetricAnomalyAlertParams) => {
  const { metric, threshold, influencerFilter, nodeType } = params as MetricAnomalyParams;

  const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
  const throttleIntervalInSeconds = getIntervalInSeconds(alertThrottle);

  const lookbackInterval = `1${lookback}`;
  const lookbackIntervalInSeconds = getIntervalInSeconds(lookbackInterval);
  const endTime = Date.now();
  const startTime = endTime - lookbackIntervalInSeconds * 1000;

  const numberOfExecutions = Math.floor(lookbackIntervalInSeconds / alertIntervalInSeconds);
  const bucketIntervalInSeconds = getIntervalInSeconds('15m');
  const bucketsPerExecution = Math.max(
    1,
    Math.floor(alertIntervalInSeconds / bucketIntervalInSeconds)
  );

  try {
    let anomalies: MappedAnomalyHit[] = [];
    const { data } = await evaluateCondition({
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
    });
    anomalies = [...anomalies, ...data];

    const anomaliesByTime = countBy(anomalies, ({ startTime: anomStartTime }) => anomStartTime);

    let numberOfTimesFired = 0;
    let numberOfNotifications = 0;
    let throttleTracker = 0;
    let previousActionGroup: string | null = null;
    const notifyWithThrottle = (actionGroup: string) => {
      if (alertNotifyWhen === 'onActionGroupChange') {
        if (previousActionGroup !== actionGroup) numberOfNotifications++;
      } else if (alertNotifyWhen === 'onThrottleInterval') {
        if (throttleTracker === 0) numberOfNotifications++;
        throttleTracker += alertIntervalInSeconds;
      } else {
        numberOfNotifications++;
      }
      previousActionGroup = actionGroup;
    };
    // Mock each alert evaluation
    for (let i = 0; i < numberOfExecutions; i++) {
      const executionTime = startTime + alertIntervalInSeconds * 1000 * i;
      // Get an array of bucket times this mock alert evaluation will be looking at
      // Anomalies are bucketed at :00, :15, :30, :45 minutes every hour,
      // so this is an array of how many of those times occurred between this evaluation
      // and the previous one
      const bucketsLookedAt = Array.from(Array(bucketsPerExecution), (_, idx) => {
        const previousBucketStartTime =
          executionTime -
          (executionTime % (bucketIntervalInSeconds * 1000)) -
          idx * bucketIntervalInSeconds * 1000;
        return previousBucketStartTime;
      });
      const anomaliesDetectedInBuckets = bucketsLookedAt.some((bucketTime) =>
        Reflect.has(anomaliesByTime, bucketTime)
      );

      if (anomaliesDetectedInBuckets) {
        numberOfTimesFired++;
        notifyWithThrottle('fired');
      } else {
        previousActionGroup = 'recovered';
        if (throttleTracker > 0) {
          throttleTracker += alertIntervalInSeconds;
        }
      }
      if (throttleTracker >= throttleIntervalInSeconds) {
        throttleTracker = 0;
      }
    }

    return { fired: numberOfTimesFired, notifications: numberOfNotifications };
  } catch (e) {
    if (!isTooManyBucketsPreviewException(e)) throw e;
    const { maxBuckets } = e;
    throw new Error(`${TOO_MANY_BUCKETS_PREVIEW_EXCEPTION}:${maxBuckets}`);
  }
};
