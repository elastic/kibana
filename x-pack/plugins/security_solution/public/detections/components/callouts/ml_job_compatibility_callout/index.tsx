/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { CallOutMessage, CallOutSwitcher } from '../../../../common/components/callouts';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { affectedJobIds } from './affected_job_ids';
import * as i18n from './translations';

const mlJobCompatibilityCalloutMessage: CallOutMessage = {
  type: 'warning',
  id: 'ml-job-compatibility',
  title: i18n.ML_JOB_COMPATIBILITY_CALLOUT_TITLE,
  description: <i18n.MlJobCompatibilityCalloutBody />,
};

const MlJobCompatibilityCalloutComponent = () => {
  const { loading, jobs } = useInstalledSecurityJobs();
  const newJobsInstalled = jobs.some((job) => affectedJobIds.includes(job.id));

  return (
    <CallOutSwitcher
      namespace="detections"
      condition={!loading && newJobsInstalled}
      message={mlJobCompatibilityCalloutMessage}
    />
  );
};

export const MlJobCompatibilityCallout = memo(MlJobCompatibilityCalloutComponent);
