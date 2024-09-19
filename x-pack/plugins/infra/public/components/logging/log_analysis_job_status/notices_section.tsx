/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QualityWarning } from '../../../../common/log_analysis';
import { LogAnalysisJobProblemIndicator } from './log_analysis_job_problem_indicator';
import { CategoryQualityWarnings } from './quality_warning_notices';

export const CategoryJobNoticesSection: React.FC<{
  hasOutdatedJobConfigurations: boolean;
  hasOutdatedJobDefinitions: boolean;
  hasSetupCapabilities: boolean;
  hasStoppedJobs: boolean;
  isFirstUse: boolean;
  moduleName: string;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
  qualityWarnings: QualityWarning[];
}> = ({
  hasOutdatedJobConfigurations,
  hasOutdatedJobDefinitions,
  hasSetupCapabilities,
  hasStoppedJobs,
  isFirstUse,
  moduleName,
  onRecreateMlJobForReconfiguration,
  onRecreateMlJobForUpdate,
  qualityWarnings,
}) => (
  <>
    <LogAnalysisJobProblemIndicator
      hasOutdatedJobConfigurations={hasOutdatedJobConfigurations}
      hasOutdatedJobDefinitions={hasOutdatedJobDefinitions}
      hasSetupCapabilities={hasSetupCapabilities}
      hasStoppedJobs={hasStoppedJobs}
      isFirstUse={isFirstUse}
      moduleName={moduleName}
      onRecreateMlJobForReconfiguration={onRecreateMlJobForReconfiguration}
      onRecreateMlJobForUpdate={onRecreateMlJobForUpdate}
    />
    <CategoryQualityWarnings
      hasSetupCapabilities={hasSetupCapabilities}
      qualityWarnings={qualityWarnings}
      onRecreateMlJob={onRecreateMlJobForReconfiguration}
    />
  </>
);
