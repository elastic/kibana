/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CallOutMessage, CallOutSwitcher } from '../../../../common/components/callouts';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';

import * as i18n from './translations';

const mlJobUpgradeCalloutMessage: CallOutMessage = {
  type: 'primary',
  id: 'ml-job-upgrade',
  title: i18n.ML_JOB_UPGRADE_CALLOUT_TITLE,
  description: <i18n.MlJobUpgradeCalloutBody />,
};

const MlJobUpgradeCalloutComponent = () => {
  const { loading, jobs } = useInstalledSecurityJobs();
  const newJobsInstalled = jobs.some((job) => job.id.startsWith('v2_'));

  return (
    <CallOutSwitcher
      namespace="detections"
      condition={!loading && newJobsInstalled}
      message={mlJobUpgradeCalloutMessage}
    />
  );
};

export const MlJobUpgradeCallout = memo(MlJobUpgradeCalloutComponent);
