/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'lodash';
import { IScopedClusterClient } from '../../../../../../../src/core/server';
import { InfraSource } from '../../../../common/http_api/source_api';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { MetricExpressionParams } from './types';
import { evaluateAlert } from './lib/evaluate_alert';

interface PreviewMetricThresholdAlertParams {
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  params: {
    criteria: MetricExpressionParams[];
    groupBy: string | undefined | string[];
    filterQuery: string | undefined;
  };
  config: InfraSource['configuration'];
  lookback: 'h' | 'd' | 'w' | 'm';
}

export const previewMetricThresholdAlert: (
  params: PreviewMetricThresholdAlertParams
) => Promise<Array<number | null | undefined>> = async ({
  callCluster,
  params,
  config,
  lookback,
}) => {
  const interval = `1${lookback}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);

  const end = Date.now();
  const start = end - intervalAsSeconds * 1000;
  const timeframe = { start, end };

  const alertResults = await evaluateAlert(callCluster, params, config, timeframe);
  const groups = Object.keys(first(alertResults));

  return groups.map((group) => {
    const isNoData = alertResults.some((alertResult) => alertResult[group].isNoData);
    if (isNoData) {
      return null;
    }
    const isError = alertResults.some((alertResult) => alertResult[group].isError);
    if (isError) {
      return undefined;
    }

    const numberOfBuckets = first(alertResults)[group].shouldFire.length;

    // Count the number of buckets that fired for every alert condition
    return [...Array(numberOfBuckets)].reduce(
      (totalFired, _, i) =>
        totalFired + alertResults.every((alertResult) => alertResult[group].shouldFire[i]) ? 1 : 0,
      0
    );
  });
};
