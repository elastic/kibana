/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { CalendarManager } from '../calendar';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { MlJobsResponse } from './jobs';

interface Group {
  id: string;
  jobIds: string[];
  calendarIds: string[];
}

interface Results {
  [id: string]: {
    success: boolean;
    error?: any;
  };
}

export function groupsProvider(callAsCurrentUser: LegacyAPICaller) {
  const calMngr = new CalendarManager(callAsCurrentUser);

  async function getAllGroups() {
    const groups: { [id: string]: Group } = {};
    const jobIds: { [id: string]: undefined | null } = {};
    const [{ jobs }, calendars] = await Promise.all([
      callAsCurrentUser<MlJobsResponse>('ml.jobs'),
      calMngr.getAllCalendars(),
    ]);

    if (jobs) {
      jobs.forEach((job) => {
        jobIds[job.job_id] = null;
        if (job.groups !== undefined) {
          job.groups.forEach((g) => {
            if (groups[g] === undefined) {
              groups[g] = {
                id: g,
                jobIds: [job.job_id],
                calendarIds: [],
              };
            } else {
              groups[g].jobIds.push(job.job_id);
            }
          });
        }
      });
    }
    if (calendars) {
      calendars.forEach((cal) => {
        cal.job_ids.forEach((jId) => {
          // don't include _all in the calendar groups list
          if (jId !== GLOBAL_CALENDAR && jobIds[jId] === undefined) {
            if (groups[jId] === undefined) {
              groups[jId] = {
                id: jId,
                jobIds: [],
                calendarIds: [cal.calendar_id],
              };
            } else {
              groups[jId].calendarIds.push(cal.calendar_id);
            }
          }
        });
      });
    }

    return Object.keys(groups).map((g) => groups[g]);
  }

  async function updateGroups(jobs: Job[]) {
    const results: Results = {};
    for (const job of jobs) {
      const { job_id: jobId, groups } = job;
      try {
        await callAsCurrentUser('ml.updateJob', { jobId, body: { groups } });
        results[jobId] = { success: true };
      } catch (error) {
        results[jobId] = { success: false, error };
      }
    }
    return results;
  }

  return {
    getAllGroups,
    updateGroups,
  };
}
