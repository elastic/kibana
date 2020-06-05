/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import Boom from 'boom';
import { APICaller } from 'kibana/server';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import {
  MlSummaryJob,
  AuditMessage,
  Job,
  JobStats,
  DatafeedWithStats,
  CombinedJobWithStats,
  ModelSnapshot,
} from '../../../common/types/anomaly_detection_jobs';
import { datafeedsProvider, MlDatafeedsResponse, MlDatafeedsStatsResponse } from './datafeeds';
import { jobsProvider, MlJobsResponse, MlJobsStatsResponse } from './jobs';
import { FormCalendar, CalendarManager } from '../calendar';

export interface ModelSnapshotsResponse {
  count: number;
  model_snapshots: ModelSnapshot[];
}
export interface RevertModelSnapshotResponse {
  model: ModelSnapshot;
}

export function modelSnapshotProvider(callAsCurrentUser: APICaller) {
  const { forceStartDatafeeds, getDatafeedIdsByJobId } = datafeedsProvider(callAsCurrentUser);
  // const { MlJobsResponse } = jobsProvider(callAsCurrentUser);

  async function revertModelSnapshot(
    jobId: string,
    snapshotId: string,
    replay: boolean,
    end: number,
    deleteInterveningResults: boolean = true,
    skip?: { start: number; end: number }
  ) {
    const job = await callAsCurrentUser<MlJobsResponse>('ml.jobs', { jobId: [jobId] });
    const jobStats = await callAsCurrentUser<MlJobsStatsResponse>('ml.jobStats', {
      jobId: [jobId],
    });

    const datafeedIds = await getDatafeedIdsByJobId();
    const datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      throw Boom.notFound(`Cannot find datafeed for job ${jobId}`);
    }
    const datafeed = await callAsCurrentUser<MlDatafeedsResponse>('ml.datafeeds', {
      datafeedId: [datafeedId],
    });

    if (skip !== undefined) {
      const calendar: FormCalendar = {
        calendarId: String(Date.now()),
        job_ids: [jobId],
        description: 'auto created',
        events: [
          {
            description: 'Auto created',
            start_time: skip.start,
            end_time: skip.end,
          },
        ],
      };
      const cm = new CalendarManager(callAsCurrentUser);
      await cm.newCalendar(calendar);
    }

    const snapshot = await callAsCurrentUser<ModelSnapshotsResponse>('ml.modelSnapshots', {
      jobId,
      snapshotId,
    });

    const resp = await callAsCurrentUser<RevertModelSnapshotResponse>('ml.revertModelSnapshot', {
      jobId,
      snapshotId,
      body: {
        delete_intervening_results: deleteInterveningResults,
      },
    });

    if (replay && snapshot && snapshot.model_snapshots.length) {
      forceStartDatafeeds([datafeedId], snapshot.model_snapshots[0].latest_record_time_stamp, end);
    }

    return { success: true };
  }

  return { revertModelSnapshot };
}
