/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  environment,
  timeSeriesDates,
  setup,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  environment: string | undefined;
  timeSeriesDates: number[];
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  // don't fetch anomalies without a type
  if (!transactionType) {
    return;
  }

  if (setup.uiFiltersES.length > 0) {
    // filter out known uiFilters like service.environment & service.name
    const unknownFilters = setup.uiFiltersES.filter(
      (uiFilter) =>
        !uiFilter.term?.[SERVICE_ENVIRONMENT] && !uiFilter.terms?.[SERVICE_NAME]
    );
    // don't fetch anomalies if unknown uiFilters are applied
    if (unknownFilters.length > 0) {
      return;
    }
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

  const mlJobIds = await getMLJobIds(setup.ml, environment);

  // don't fetch anomalies if there are more than 1 ML jobs for the given environment
  if (mlJobIds.length > 1) {
    return;
  }
  const jobId = mlJobIds[0];

  const mlBucketSize = await getMlBucketSize({
    serviceName,
    transactionType,
    setup,
    jobId,
  });

  const { start, end } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const esResponse = await anomalySeriesFetcher({
    serviceName,
    transactionType,
    intervalString,
    mlBucketSize,
    setup,
    jobId,
  });

  return esResponse
    ? anomalySeriesTransform(
        esResponse,
        mlBucketSize,
        bucketSize,
        timeSeriesDates,
        jobId
      )
    : undefined;
}
