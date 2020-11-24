/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import { isNumber } from 'lodash';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';
import { anomalySeriesFetcher } from './fetcher';
import { getMlBucketSize } from './get_ml_bucket_size';
import { anomalySeriesTransform } from './transform';
import { getMLJobIds } from '../../../service_map/get_service_anomalies';

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  timeSeriesDates,
  setup,
  logger,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  timeSeriesDates: number[];
  setup: Setup & SetupTimeRange;
  logger: Logger;
}) {
  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  // don't fetch anomalies without a type
  if (!transactionType) {
    return;
  }

  const { uiFilters, start, end } = setup;
  const { environment } = uiFilters;

  // don't fetch anomalies when no specific environment is selected
  if (environment === ENVIRONMENT_ALL.value) {
    return;
  }

  // don't fetch anomalies if unknown uiFilters are applied
  const knownFilters = ['environment', 'serviceName'];
  const hasUnknownFiltersApplied = Object.entries(setup.uiFilters)
    .filter(([key, value]) => !!value)
    .map(([key]) => key)
    .some((uiFilterName) => !knownFilters.includes(uiFilterName));

  if (hasUnknownFiltersApplied) {
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

  const mlJobIds = await getMLJobIds(setup.ml.anomalyDetectors, environment);

  const jobId = mlJobIds[0];

  const mlBucketSize = await getMlBucketSize({ setup, jobId, logger });
  if (!isNumber(mlBucketSize)) {
    return;
  }

  const { intervalString, bucketSize } = getBucketSize({ start, end });

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
