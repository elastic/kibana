/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import { mlJobService } from 'plugins/ml/services/job_service'; // TODO: change to relative path
import { i18n } from '@kbn/i18n';


// function warnAboutInvalidJobIds(invalidIds) {
//   if (invalidIds.length > 0) {
//     toastNotifications.addWarning(i18n.translate('xpack.ml.jobSelect.requestedJobsDoesNotExistWarningMessage', {
//       defaultMessage: `Requested
// {invalidIdsLength, plural, one {job {invalidIds} does not exist} other {jobs {invalidIds} do not exist}}`,
//       values: {
//         invalidIdsLength: invalidIds.length,
//         invalidIds,
//       }
//     }));
//   }
// }

// function removeGroupIds(jobIds) {
//   return jobIds.map(id => {
//     const splitId = id.split('.');
//     return (splitId.length > 1) ? splitId[1] : splitId[0];
//   });
// }

// check that the ids read from the url exist by comparing them to the
// jobs loaded via mlJobsService.
// function getInvalidJobIds(ids) {
//   return ids.filter(id => {
//     const job = _.find(mlJobService.jobs, { 'job_id': id });
//     return (job === undefined && id !== '*');
//   });
// }

function loadJobIdsFromGlobalState(globalState) {
  const jobIds = [];
  if (globalState.ml && globalState.ml.jobIds) {
    let tempJobIds = [];
    if (typeof globalState.ml.jobIds === 'string') {
      tempJobIds.push(globalState.ml.jobIds);
    } else {
      tempJobIds = globalState.ml.jobIds;
    }
    tempJobIds = tempJobIds.map(id => String(id));
    // const invalidIds = getInvalidJobIds(removeGroupIds(tempJobIds));
    // warnAboutInvalidJobIds(invalidIds);

    // let validIds = _.difference(tempJobIds, invalidIds);

    // if there are no valid ids, warn and then select the first job
    // if (validIds.length === 0) { // NOTE changed validIds below to tempJobIds
    if (tempJobIds.length === 0) {
      toastNotifications.addWarning(i18n.translate('xpack.ml.jobSelect.noJobsSelectedWarningMessage', {
        defaultMessage: 'No jobs selected, auto selecting first job',
      }));

      if (mlJobService.jobs.length) {
        tempJobIds = [mlJobService.jobs[0].job_id];
      }
    }
    jobIds.push(...tempJobIds);
  } else {
    // no jobs selected, use the first in the list
    if (mlJobService.jobs.length) {
      jobIds.push(mlJobService.jobs[0].job_id);
    }
  }
  return jobIds;
}

// takes an array of ids.
// this could be a mixture of job ids, group ids or a *.
// stores an expanded list of job ids (i.e. groupId.jobId) and a list of jobs ids only.
// creates the description text used on the job picker button.
// function processIds(service, ids) {
//   const expandedJobIds = expandGroups(ids);
//   service.jobIdsWithGroup.length = 0;
//   service.jobIdsWithGroup.push(...expandedJobIds);
//   service.groupIds = getGroupIds(ids);
//   service.jobIds.length = 0;
//   service.jobIds.push(...removeGroupIds(expandedJobIds));
//   service.description.txt = createDescription(service.jobIdsWithGroup);
//   service.singleJobDescription.txt = ids[0];
//   setBrowserTitle(service.description.txt);
// }

// called externally to retrieve the selected jobs ids.
// passing in `true` will load the jobs ids from the URL first
export function getSelectedJobIds(globalState) {
  // return processIds(this, loadJobIdsFromGlobalState(globalState));
  return loadJobIdsFromGlobalState(globalState);
}
