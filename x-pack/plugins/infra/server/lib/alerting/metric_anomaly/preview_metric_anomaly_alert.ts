/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';
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
}: PreviewMetricAnomalyAlertParams) => {
  const { metric, threshold, influencerFilter, nodeType } = params as MetricAnomalyParams;

  const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
  const throttleIntervalInSeconds = getIntervalInSeconds(alertThrottle);
  const executionsPerThrottle = Math.floor(throttleIntervalInSeconds / alertIntervalInSeconds);

  const lookbackInterval = `1${lookback}`;
  const lookbackIntervalInSeconds = getIntervalInSeconds(lookbackInterval);

  const endTime = Date.now();
  const startTime = endTime - lookbackIntervalInSeconds * 1000;

  const numberOfBuckets = Math.floor(lookbackIntervalInSeconds / alertIntervalInSeconds);

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

    const bucketedAnomalies = countBy(anomalies, ({ startTime: anomStartTime }) =>
      Math.floor((anomStartTime - startTime) / (alertIntervalInSeconds * 1000))
    );
    let numberOfTimesFired = 0;
    let numberOfNotifications = 0;
    let throttleTracker = 0;
    const notifyWithThrottle = () => {
      if (throttleTracker === 0) numberOfNotifications++;
      throttleTracker++;
    };
    for (let i = 0; i < numberOfBuckets; i++) {
      if (Reflect.has(bucketedAnomalies, i)) {
        numberOfTimesFired++;
        notifyWithThrottle();
      } else if (throttleTracker > 0) {
        throttleTracker++;
      }
      if (throttleTracker === executionsPerThrottle) {
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
