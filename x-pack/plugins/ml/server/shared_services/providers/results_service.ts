/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { LicenseCheck } from '../license_checks';
import { resultsServiceProvider } from '../../models/results_service';

export interface ResultsServiceProvider {
  resultsServiceProvider(
    callAsCurrentUser: LegacyAPICaller
  ): ReturnType<typeof resultsServiceProvider>;
}

export function getResultsServiceProvider(isFullLicense: LicenseCheck): ResultsServiceProvider {
  return {
    resultsServiceProvider(callAsCurrentUser: LegacyAPICaller) {
      isFullLicense();
      return resultsServiceProvider(callAsCurrentUser);
    },
  };
}
