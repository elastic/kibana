/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { QualityWarning } from '../../../containers/logs/log_analysis/log_analysis_module_types';
import { LogAnalysisJobProblemIndicator } from './log_analysis_job_problem_indicator';
import { CategoryQualityWarnings } from './quality_warning_notices';

export const CategoryJobNoticesSection: React.FC<{
  hasOutdatedJobConfigurations: boolean;
  hasOutdatedJobDefinitions: boolean;
  hasStoppedJobs: boolean;
  isFirstUse: boolean;
  moduleName: string;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
  qualityWarnings: QualityWarning[];
}> = ({
  hasOutdatedJobConfigurations,
  hasOutdatedJobDefinitions,
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
      hasStoppedJobs={hasStoppedJobs}
      isFirstUse={isFirstUse}
      moduleName={moduleName}
      onRecreateMlJobForReconfiguration={onRecreateMlJobForReconfiguration}
      onRecreateMlJobForUpdate={onRecreateMlJobForUpdate}
    />
    <CategoryQualityWarnings qualityWarnings={qualityWarnings} />
  </>
);
