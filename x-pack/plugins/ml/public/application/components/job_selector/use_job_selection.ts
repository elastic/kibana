/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference } from 'lodash';
import { useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';

import { useUrlState } from '../../util/url_state';

import { useNotifications } from '../../contexts/kibana';
import { useJobSelectionFlyout } from '../../contexts/ml/use_job_selection_flyout';

// check that the ids read from the url exist by comparing them to the
// jobs loaded via mlJobsService.
function getInvalidJobIds(jobs: MlJobWithTimeRange[], ids: string[]) {
  return ids.filter((id) => {
    const jobExists = jobs.some((job) => job.job_id === id);
    return jobExists === false && id !== '*';
  });
}

export interface JobSelection {
  jobIds: string[];
  selectedGroups: string[];
}

export const useJobSelection = (jobs: MlJobWithTimeRange[]) => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const { toasts: toastNotifications } = useNotifications();

  const getJobSelection = useJobSelectionFlyout();

  const tmpIds = useMemo(() => {
    const ids = globalState?.ml?.jobIds || [];
    return (typeof ids === 'string' ? [ids] : ids).map((id: string) => String(id));
  }, [globalState?.ml?.jobIds]);

  const invalidIds = useMemo(() => {
    return getInvalidJobIds(jobs, tmpIds);
  }, [tmpIds]);

  const validIds = useMemo(() => {
    const res = difference(tmpIds, invalidIds);
    res.sort();
    return res;
  }, [tmpIds, invalidIds]);

  const jobSelection: JobSelection = useMemo(() => {
    const selectedGroups = globalState?.ml?.groups ?? [];
    return { jobIds: validIds, selectedGroups };
  }, [validIds, globalState?.ml?.groups]);

  useEffect(() => {
    if (invalidIds.length > 0) {
      toastNotifications.addWarning(
        i18n.translate('xpack.ml.jobSelect.requestedJobsDoesNotExistWarningMessage', {
          defaultMessage: `Requested
{invalidIdsLength, plural, one {job {invalidIds} does not exist} other {jobs {invalidIds} do not exist}}`,
          values: {
            invalidIdsLength: invalidIds.length,
            invalidIds: invalidIds.join(),
          },
        })
      );
    }
  }, [invalidIds]);

  useEffect(() => {
    // if there are no valid ids, ask the user to provide job selection with the flyout
    if (validIds.length === 0 && jobs.length > 0) {
      getJobSelection({ singleSelection: false })
        .then(({ jobIds, time }) => {
          const mlGlobalState = globalState?.ml || {};
          mlGlobalState.jobIds = jobIds;

          setGlobalState({
            ...{ ml: mlGlobalState },
            ...(time !== undefined ? { time } : {}),
          });
        })
        .catch(() => {
          // flyout closed without selection
        });
    }
  }, [jobs, validIds, setGlobalState, globalState?.ml]);

  return jobSelection;
};
