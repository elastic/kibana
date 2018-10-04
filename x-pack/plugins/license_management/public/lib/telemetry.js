/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchTelemetry } from '../../../xpack_main/public/hacks/fetch_telemetry';
export { PRIVACY_STATEMENT_URL } from '../../../xpack_main/common/constants';
export { TelemetryOptInProvider } from '../../../xpack_main/public/services/telemetry_opt_in';
export { OptInExampleFlyout } from '../../../xpack_main/public/components';

let telemetryEnabled;
let httpClient;
let telemetryOptInService;
export const setTelemetryEnabled = (isTelemetryEnabled) => {
  telemetryEnabled = isTelemetryEnabled;
};
export const setHttpClient = (anHttpClient) => {
  httpClient = anHttpClient;
};
export const setTelemetryOptInService = (aTelemetryOptInService) => {
  telemetryOptInService = aTelemetryOptInService;
};
export const optInToTelemetry = async (enableTelemetry) => {
  await telemetryOptInService.setOptIn(enableTelemetry);
};
export const showTelemetryOptIn = () => {
  return telemetryEnabled && !telemetryOptInService.getOptIn();
};
export const getTelemetryFetcher = () => {
  return fetchTelemetry(httpClient);
};
