/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../../helpers/setup_request';
import { Coordinate, RectCoordinate } from '../../../../../typings/timeseries';

interface AnomalyTimeseries {
  anomalyBoundaries: Coordinate[];
  anomalyScore: RectCoordinate[];
}

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  timeSeriesDates,
  setup,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  timeSeriesDates: number[];
  setup: Setup & SetupTimeRange & SetupUIFilters;
}): Promise<void | AnomalyTimeseries> {
  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  // don't fetch anomalies without a type
  if (!transactionType) {
    return;
  }

  // don't fetch anomalies if uiFilters are applied
  if (setup.uiFiltersES.length > 0) {
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

  // TODO [APM ML] return a series of anomaly scores, upper & lower bounds for the given timeSeriesDates
  return;
}
