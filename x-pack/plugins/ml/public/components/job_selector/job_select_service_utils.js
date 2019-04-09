/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash'; // TODO: find a way to not rely on this anymore
import { toastNotifications } from 'ui/notify';
import { mlJobService } from 'plugins/ml/services/job_service'; // TODO: change to relative path
import { i18n } from '@kbn/i18n';


function warnAboutInvalidJobIds(invalidIds) {
  if (invalidIds.length > 0) {
    toastNotifications.addWarning(i18n.translate('xpack.ml.jobSelect.requestedJobsDoesNotExistWarningMessage', {
      defaultMessage: `Requested
{invalidIdsLength, plural, one {job {invalidIds} does not exist} other {jobs {invalidIds} do not exist}}`,
      values: {
        invalidIdsLength: invalidIds.length,
        invalidIds,
      }
    }));
  }
}

// check that the ids read from the url exist by comparing them to the
// jobs loaded via mlJobsService.
function getInvalidJobIds(ids) {
  return ids.filter(id => {
    const job = _.find(mlJobService.jobs, { 'job_id': id });
    return (job === undefined && id !== '*');
  });
}

function loadJobIdsFromGlobalState(globalState) {
  const jobIds = [];
  if (globalState.ml && globalState.ml.jobIds) {
    let tempJobIds = [];
    let validIds;
    if (typeof globalState.ml.jobIds === 'string') {
      tempJobIds.push(globalState.ml.jobIds);
    } else {
      tempJobIds = globalState.ml.jobIds;
    }
    tempJobIds = tempJobIds.map(id => String(id));
    // check if ids valid if jobs loaded
    // TODO: Do we need this from the first load? Might need to move this validity check
    // to the explorer controller or to the job selector component
    if (mlJobService.jobs.length > 0) {
      const invalidIds = getInvalidJobIds(tempJobIds);
      warnAboutInvalidJobIds(invalidIds);

      validIds = _.difference(tempJobIds, invalidIds);
    } else {
      validIds = tempJobIds;
    }

    // if there are no valid ids, warn and then select the first job
    if (validIds.length === 0) {
      toastNotifications.addWarning(i18n.translate('xpack.ml.jobSelect.noJobsSelectedWarningMessage', {
        defaultMessage: 'No jobs selected, auto selecting first job',
      }));

      if (mlJobService.jobs.length) {
        validIds = [mlJobService.jobs[0].job_id];
      }
    }
    jobIds.push(...validIds);
  } else {
    // no jobs selected, use the first in the list
    if (mlJobService.jobs.length) {
      jobIds.push(mlJobService.jobs[0].job_id);
    }
  }
  return jobIds;
}

// called externally to retrieve the selected jobs ids.
// passing in `true` will load the jobs ids from the URL first
export function getSelectedJobIds(globalState) {
  return loadJobIdsFromGlobalState(globalState);
}
