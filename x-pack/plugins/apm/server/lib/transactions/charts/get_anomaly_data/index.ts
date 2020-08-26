/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import { isNumber } from 'lodash';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../../helpers/setup_request';
import { anomalySeriesFetcher } from './fetcher';
import { getMlBucketSize } from './get_ml_bucket_size';
import { anomalySeriesTransform } from './transform';
import { getMLJobIds } from '../../../service_map/get_service_anomalies';
import { UIFilters } from '../../../../../typings/ui_filters';

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  timeSeriesDates,
  setup,
  logger,
  uiFilters,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  timeSeriesDates: number[];
  setup: Setup & SetupTimeRange & SetupUIFilters;
  logger: Logger;
  uiFilters: UIFilters;
}) {
  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  // don't fetch anomalies without a type
  if (!transactionType) {
    return;
  }

  // don't fetch anomalies if unknown uiFilters are applied
  const knownFilters = ['environment', 'serviceName'];
  const uiFilterNames = Object.keys(uiFilters);
  if (
    uiFilterNames.some((uiFilterName) => !knownFilters.includes(uiFilterName))
  ) {
    return;
  }

  // don't fetch anomalies if the ML plugin is not setup
  if (!setup.ml) {
    return;
  }

  // don't fetch anomalies if required license is not satisfied
  const mlCapabilities = await setup.ml.mlSystem.mlCapabilities();
  if (!mlCapabilities.isPlatinumOrTrialLicense) {
    return;
  }

  let mlJobIds: string[] = [];
  try {
    mlJobIds = await getMLJobIds(
      setup.ml.anomalyDetectors,
      uiFilters.environment
    );
  } catch (error) {
    logger.error(error);
    return;
  }

  // don't fetch anomalies if there are isn't exaclty 1 ML job match for the given environment
  if (mlJobIds.length !== 1) {
    return;
  }
  const jobId = mlJobIds[0];

  const mlBucketSize = await getMlBucketSize({ setup, jobId, logger });
  if (!isNumber(mlBucketSize)) {
    return;
  }

  const { start, end } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const esResponse = await anomalySeriesFetcher({
    serviceName,
    transactionType,
    intervalString,
    mlBucketSize,
    setup,
    jobId,
    logger,
  });

  if (esResponse && mlBucketSize > 0) {
    return anomalySeriesTransform(
      esResponse,
      mlBucketSize,
      bucketSize,
      timeSeriesDates,
      jobId
    );
  }
}
