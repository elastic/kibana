/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { mlResultsService } from '../services/results_service';
import { ToastNotificationService } from '../services/toast_notification_service';
import { getControlsForDetector } from './get_controls_for_detector';
import { getCriteriaFields } from './get_criteria_fields';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { ML_JOB_AGGREGATION } from '../../../common/constants/aggregation_types';

/**
 * Get the function description from the record with the highest anomaly score
 */
export const getFunctionDescription = async (
  {
    selectedDetectorIndex,
    selectedEntities,
    selectedJobId,
    selectedJob,
  }: {
    selectedDetectorIndex: number;
    selectedEntities: Record<string, any>;
    selectedJobId: string;
    selectedJob: CombinedJob;
  },
  toastNotificationService: ToastNotificationService
) => {
  // if the detector's function is metric, fetch the highest scoring anomaly record
  // and set to plot the function_description (avg/min/max) of that record by default
  if (
    selectedJob?.analysis_config?.detectors[selectedDetectorIndex]?.function !==
    ML_JOB_AGGREGATION.METRIC
  )
    return;

  const entityControls = getControlsForDetector(
    selectedDetectorIndex,
    selectedEntities,
    selectedJobId
  );
  const criteriaFields = getCriteriaFields(selectedDetectorIndex, entityControls);

  try {
    const resp = await mlResultsService
      .getRecordsForCriteria([selectedJob.job_id], criteriaFields, 0, null, null, 1)
      .toPromise();
    if (Array.isArray(resp?.records) && resp.records.length === 1) {
      const highestScoringAnomaly = resp.records[0];
      return highestScoringAnomaly?.function_description;
    }
  } catch (error) {
    toastNotificationService.displayErrorToast(
      error,
      i18n.translate('xpack.ml.timeSeriesExplorer.highestAnomalyScoreErrorToastTitle', {
        defaultMessage: 'An error occurred getting record with the highest anomaly score',
      })
    );
  }
};
