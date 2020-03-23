/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { JobStatus, SetupStatus } from '../../../../common/log_analysis';
import { JobConfigurationOutdatedCallout } from './job_configuration_outdated_callout';
import { JobDefinitionOutdatedCallout } from './job_definition_outdated_callout';
import { JobStoppedCallout } from './job_stopped_callout';

export const LogAnalysisJobProblemIndicator: React.FC<{
  jobStatus: JobStatus;
  setupStatus: SetupStatus;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
}> = ({ jobStatus, setupStatus, onRecreateMlJobForReconfiguration, onRecreateMlJobForUpdate }) => {
  if (isStopped(jobStatus)) {
    return <JobStoppedCallout />;
  } else if (isUpdatable(setupStatus)) {
    return <JobDefinitionOutdatedCallout onRecreateMlJob={onRecreateMlJobForUpdate} />;
  } else if (isReconfigurable(setupStatus)) {
    return <JobConfigurationOutdatedCallout onRecreateMlJob={onRecreateMlJobForReconfiguration} />;
  }

  return null; // no problem to indicate
};

const isStopped = (jobStatus: JobStatus) => jobStatus === 'stopped';

const isUpdatable = (setupStatus: SetupStatus) => setupStatus === 'skippedButUpdatable';

const isReconfigurable = (setupStatus: SetupStatus) => setupStatus === 'skippedButReconfigurable';

export const jobHasProblem = (jobStatus: JobStatus, setupStatus: SetupStatus) =>
  isStopped(jobStatus) || isUpdatable(setupStatus) || isReconfigurable(setupStatus);
