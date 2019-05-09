/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference } from 'lodash';
import { toastNotifications } from 'ui/notify';
import { mlJobService } from '../../services/job_service';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import d3 from 'd3';


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
    const jobExists = mlJobService.jobs.some(job => job.job_id === id);
    return (jobExists === false && id !== '*');
  });
}

function checkGlobalState(globalState) {
  if (globalState.ml === undefined) {
    globalState.ml = {};
    globalState.save();
  }
}

function loadJobIdsFromGlobalState(globalState) { // jobIds, groups
  const jobIds = [];
  let groups = [];

  if (globalState.ml && globalState.ml.jobIds) {
    let tempJobIds = [];
    groups = globalState.ml.groups || [];

    if (typeof globalState.ml.jobIds === 'string') {
      tempJobIds.push(globalState.ml.jobIds);
    } else {
      tempJobIds = globalState.ml.jobIds;
    }
    tempJobIds = tempJobIds.map(id => String(id));

    const invalidIds = getInvalidJobIds(tempJobIds);
    warnAboutInvalidJobIds(invalidIds);

    let validIds = difference(tempJobIds, invalidIds);
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
  return { jobIds, selectedGroups: groups };
}

export function setGlobalState(globalState, { selectedIds, selectedGroups }) {
  checkGlobalState(globalState);
  globalState.ml.jobIds = selectedIds;
  globalState.ml.groups = selectedGroups;
  globalState.save();
}

// called externally to retrieve the selected jobs ids.
// passing in `true` will load the jobs ids from the URL first
export function getSelectedJobIds(globalState) {
  return loadJobIdsFromGlobalState(globalState);
}

export function getGroupsFromJobs(jobs) {
  const groups = {};
  const groupsMap = {};

  jobs.forEach((job) => {
    // Organize job by group
    if (job.groups !== undefined) {
      job.groups.forEach((g) => {
        if (groups[g] === undefined) {
          groups[g] = {
            id: g,
            jobIds: [job.job_id],
            timeRange: {
              to: job.timeRange.to,
              toMoment: null,
              from: job.timeRange.from,
              fromMoment: null,
              fromPx: job.timeRange.fromPx,
              toPx: job.timeRange.toPx,
              widthPx: null,
            }
          };

          groupsMap[g] = [job.job_id];
        } else {
          groups[g].jobIds.push(job.job_id);
          groupsMap[g].push(job.job_id);
          // keep track of earliest 'from' / latest 'to' for group range
          if (groups[g].timeRange.to === null || job.timeRange.to > groups[g].timeRange.to) {
            groups[g].timeRange.to = job.timeRange.to;
            groups[g].timeRange.toMoment = job.timeRange.toMoment;
          }
          if (groups[g].timeRange.from === null || job.timeRange.from < groups[g].timeRange.from) {
            groups[g].timeRange.from = job.timeRange.from;
            groups[g].timeRange.fromMoment = job.timeRange.fromMoment;
          }
          if (groups[g].timeRange.toPx === null || job.timeRange.toPx > groups[g].timeRange.toPx) {
            groups[g].timeRange.toPx = job.timeRange.toPx;
          }
          if (groups[g].timeRange.fromPx === null || job.timeRange.fromPx < groups[g].timeRange.fromPx) {
            groups[g].timeRange.fromPx = job.timeRange.fromPx;
          }
        }
      });
    }
  });

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    group.timeRange.widthPx = group.timeRange.toPx - group.timeRange.fromPx;
    group.timeRange.toMoment = moment(group.timeRange.to);
    group.timeRange.fromMoment = moment(group.timeRange.from);
    // create label
    const fromString = group.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
    const toString = group.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
    group.timeRange.label = i18n.translate('xpack.ml.jobSelectList.groupTimeRangeLabel', {
      defaultMessage: '{fromString} to {toString}',
      values: {
        fromString,
        toString,
      }
    });
  });

  return { groups: Object.keys(groups).map(g => groups[g]), groupsMap };
}

export function normalizeTimes(jobs, dateFormatTz, ganttBarWidth) {
  const min = Math.min(...jobs.map(job => +job.timeRange.from));
  const max = Math.max(...jobs.map(job => +job.timeRange.to));
  const ganttScale = d3.scale.linear().domain([min, max]).range([1, ganttBarWidth]);

  jobs.forEach(job => {
    if (job.timeRange.to !== undefined && job.timeRange.from !== undefined) {
      job.timeRange.fromPx = ganttScale(job.timeRange.from);
      job.timeRange.toPx = ganttScale(job.timeRange.to);
      job.timeRange.widthPx = job.timeRange.toPx - job.timeRange.fromPx;
      // Ensure at least 1 px in width so it's always visible
      if (job.timeRange.widthPx < 1) {
        job.timeRange.widthPx = 1;
      }

      job.timeRange.toMoment = moment(job.timeRange.to).tz(dateFormatTz);
      job.timeRange.fromMoment = moment(job.timeRange.from).tz(dateFormatTz);

      const fromString = job.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
      const toString = job.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
      job.timeRange.label = i18n.translate('xpack.ml.jobSelector.jobTimeRangeLabel', {
        defaultMessage: '{fromString} to {toString}',
        values: {
          fromString,
          toString,
        }
      });
    }
  });
  return jobs;
}
