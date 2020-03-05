/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { jobSourceConfigurationRT } from '../../../../../common/log_analysis';

export const jobCustomSettingsRT = rt.partial({
  job_revision: rt.number,
  logs_source_config: rt.partial(jobSourceConfigurationRT.props),
});

export const getMlCapabilitiesResponsePayloadRT = rt.type({
  capabilities: rt.type({
    canGetJobs: rt.boolean,
    canCreateJob: rt.boolean,
    canDeleteJob: rt.boolean,
    canOpenJob: rt.boolean,
    canCloseJob: rt.boolean,
    canForecastJob: rt.boolean,
    canGetDatafeeds: rt.boolean,
    canStartStopDatafeed: rt.boolean,
    canUpdateJob: rt.boolean,
    canUpdateDatafeed: rt.boolean,
    canPreviewDatafeed: rt.boolean,
  }),
  isPlatinumOrTrialLicense: rt.boolean,
  mlFeatureEnabledInSpace: rt.boolean,
  upgradeInProgress: rt.boolean,
});

export type GetMlCapabilitiesResponsePayload = rt.TypeOf<typeof getMlCapabilitiesResponsePayloadRT>;
