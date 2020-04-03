/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LogAnalysisJobProblemIndicator } from '../../../../../components/logging/log_analysis_job_status';
import { QualityWarning } from './quality_warnings';
import { CategoryQualityWarnings } from './quality_warning_notices';

export const CategoryJobNoticesSection: React.FC<{
  hasOutdatedJobConfigurations: boolean;
  hasOutdatedJobDefinitions: boolean;
  hasStoppedJobs: boolean;
  isFirstUse: boolean;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
  qualityWarnings: QualityWarning[];
}> = ({
  hasOutdatedJobConfigurations,
  hasOutdatedJobDefinitions,
  hasStoppedJobs,
  isFirstUse,
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
      onRecreateMlJobForReconfiguration={onRecreateMlJobForReconfiguration}
      onRecreateMlJobForUpdate={onRecreateMlJobForUpdate}
    />
    <CategoryQualityWarnings qualityWarnings={qualityWarnings} />
  </>
);
