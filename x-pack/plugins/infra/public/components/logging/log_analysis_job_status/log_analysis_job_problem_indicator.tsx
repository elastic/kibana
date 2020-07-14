/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { JobConfigurationOutdatedCallout } from './job_configuration_outdated_callout';
import { JobDefinitionOutdatedCallout } from './job_definition_outdated_callout';
import { JobStoppedCallout } from './job_stopped_callout';
import { FirstUseCallout } from '../log_analysis_results';

export const LogAnalysisJobProblemIndicator: React.FC<{
  hasOutdatedJobConfigurations: boolean;
  hasOutdatedJobDefinitions: boolean;
  hasStoppedJobs: boolean;
  isFirstUse: boolean;
  moduleName: string;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
}> = ({
  hasOutdatedJobConfigurations,
  hasOutdatedJobDefinitions,
  hasStoppedJobs,
  isFirstUse,
  moduleName,
  onRecreateMlJobForReconfiguration,
  onRecreateMlJobForUpdate,
}) => {
  return (
    <>
      {hasOutdatedJobDefinitions ? (
        <JobDefinitionOutdatedCallout
          moduleName={moduleName}
          onRecreateMlJob={onRecreateMlJobForUpdate}
        />
      ) : null}
      {hasOutdatedJobConfigurations ? (
        <JobConfigurationOutdatedCallout
          moduleName={moduleName}
          onRecreateMlJob={onRecreateMlJobForReconfiguration}
        />
      ) : null}
      {hasStoppedJobs ? <JobStoppedCallout /> : null}
      {isFirstUse ? <FirstUseCallout /> : null}
    </>
  );
};
