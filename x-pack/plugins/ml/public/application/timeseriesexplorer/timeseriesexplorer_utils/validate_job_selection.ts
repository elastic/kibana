/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, without } from 'lodash';

import { i18n } from '@kbn/i18n';

import { ToastsStart } from '@kbn/core/public';
import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';

import { mlJobService } from '../../services/job_service';

import { createTimeSeriesJobData } from './timeseriesexplorer_utils';
import { GetJobSelection } from '../../contexts/ml/use_job_selection_flyout';

/**
 * FIXME validator should not have any side effects like the global state update
 * returns true/false if setGlobalState has been triggered
 * or returns the job id which should be loaded.
 */
export function validateJobSelection(
  jobsWithTimeRange: MlJobWithTimeRange[],
  selectedJobIds: string[],
  setGlobalState: (...args: any) => void,
  toastNotifications: ToastsStart,
  getJobSelection: GetJobSelection
): boolean | string {
  const jobs = createTimeSeriesJobData(mlJobService.jobs);
  const timeSeriesJobIds: string[] = jobs.map((j: any) => j.id);

  // Check if any of the jobs set in the URL are not time series jobs
  // (e.g. if switching to this view straight from the Anomaly Explorer).
  const invalidIds: string[] = difference(selectedJobIds, timeSeriesJobIds);
  const validSelectedJobIds = without(selectedJobIds, ...invalidIds);

  // show specific reason why we can't show the single metric viewer
  if (invalidIds.length === 1) {
    const selectedJobId = invalidIds[0];
    const selectedJob = jobsWithTimeRange.find((j) => j.id === selectedJobId);
    if (selectedJob !== undefined && selectedJob.isNotSingleMetricViewerJobMessage !== undefined) {
      const warningText = i18n.translate(
        'xpack.ml.timeSeriesExplorer.canNotViewRequestedJobsWarningWithReasonMessage',
        {
          defaultMessage: `You can't view {selectedJobId} in this dashboard because {reason}.`,
          values: {
            selectedJobId,
            reason: selectedJob.isNotSingleMetricViewerJobMessage,
          },
        }
      );
      toastNotifications.addWarning({
        title: warningText,
        'data-test-subj': 'mlTimeSeriesExplorerDisabledJobReasonWarningToast',
      });
    }
  }

  if (invalidIds.length > 1) {
    let warningText = i18n.translate(
      'xpack.ml.timeSeriesExplorer.canNotViewRequestedJobsWarningMessage',
      {
        defaultMessage: `You can't view requested {invalidIdsCount, plural, one {job} other {jobs}} {invalidIds} in this dashboard`,
        values: {
          invalidIdsCount: invalidIds.length,
          invalidIds: invalidIds.join(', '),
        },
      }
    );

    if (validSelectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
      warningText += i18n.translate('xpack.ml.timeSeriesExplorer.autoSelectingFirstJobText', {
        defaultMessage: ', auto selecting first job',
      });
    }
    toastNotifications.addWarning(warningText);
  }

  if (validSelectedJobIds.length > 1) {
    // if more than one job, select the first job from the selection.
    toastNotifications.addWarning(
      i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
        defaultMessage: 'You can only view one job at a time in this dashboard',
      })
    );
    setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
    return true;
  } else if (invalidIds.length > 0 && validSelectedJobIds.length > 0) {
    // if some ids have been filtered out because they were invalid.
    // refresh the URL with the first valid id
    setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
    return true;
  } else if (validSelectedJobIds.length === 1) {
    // normal behavior. a job ID has been loaded from the URL
    // Clear the detectorIndex, entities and forecast info.
    return validSelectedJobIds[0];
  } else if (validSelectedJobIds.length === 0 && jobs.length > 0) {
    // no jobs were loaded from the URL.
    // Ask the user to select one.

    getJobSelection({ singleSelection: true, timeseriesOnly: true })
      .then(({ jobIds, time }) => {
        setGlobalState({
          ...{ ml: { jobIds } },
          ...(time !== undefined ? { time } : {}),
        });
      })
      .catch((e) => {
        // Flyout has been closed without selection
      });

    return true;
  } else {
    // Jobs exist, but no time series jobs.
    return false;
  }
}
