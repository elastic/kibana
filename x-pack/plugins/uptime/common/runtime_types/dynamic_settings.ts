/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CertificatesStatesThresholdType = t.interface({
  warningState: t.number,
  errorState: t.number,
});

export const DynamicSettingsType = t.intersection([
  t.type({
    heartbeatIndices: t.string,
  }),
  t.partial({
    certificatesThresholds: CertificatesStatesThresholdType,
  }),
]);

export const DynamicSettingsSaveType = t.intersection([
  t.type({
    success: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type DynamicSettings = t.TypeOf<typeof DynamicSettingsType>;
export type DynamicSettingsSaveResponse = t.TypeOf<typeof DynamicSettingsSaveType>;
export type CertificatesStatesThreshold = t.TypeOf<typeof CertificatesStatesThresholdType>;

export const defaultDynamicSettings: DynamicSettings = {
  heartbeatIndices: 'heartbeat-8*',
  certificatesThresholds: {
    errorState: 7,
    warningState: 30,
  },
};
