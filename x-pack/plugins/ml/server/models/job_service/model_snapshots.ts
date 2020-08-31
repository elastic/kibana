/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ModelSnapshot } from '../../../common/types/anomaly_detection_jobs';
import { datafeedsProvider } from './datafeeds';
import { FormCalendar, CalendarManager } from '../calendar';

export interface ModelSnapshotsResponse {
  count: number;
  model_snapshots: ModelSnapshot[];
}
export interface RevertModelSnapshotResponse {
  model: ModelSnapshot;
}

export function modelSnapshotProvider(mlClusterClient: ILegacyScopedClusterClient) {
  const { callAsInternalUser } = mlClusterClient;
  const { forceStartDatafeeds, getDatafeedIdsByJobId } = datafeedsProvider(mlClusterClient);

  async function revertModelSnapshot(
    jobId: string,
    snapshotId: string,
    replay: boolean,
    end?: number,
    deleteInterveningResults: boolean = true,
    calendarEvents?: [{ start: number; end: number; description: string }]
  ) {
    let datafeedId = `datafeed-${jobId}`;
    // ensure job exists
    await callAsInternalUser('ml.jobs', { jobId: [jobId] });

    try {
      // ensure the datafeed exists
      // the datafeed is probably called datafeed-<jobId>
      await callAsInternalUser('ml.datafeeds', {
        datafeedId: [datafeedId],
      });
    } catch (e) {
      // if the datafeed isn't called datafeed-<jobId>
      // check all datafeeds to see if one exists that is matched to this job id
      const datafeedIds = await getDatafeedIdsByJobId();
      datafeedId = datafeedIds[jobId];
      if (datafeedId === undefined) {
        throw Boom.notFound(`Cannot find datafeed for job ${jobId}`);
      }
    }

    // ensure the snapshot exists
    const snapshot = (await callAsInternalUser('ml.modelSnapshots', {
      jobId,
      snapshotId,
    })) as ModelSnapshotsResponse;

    // apply the snapshot revert
    const { model } = (await callAsInternalUser('ml.revertModelSnapshot', {
      jobId,
      snapshotId,
      body: {
        delete_intervening_results: deleteInterveningResults,
      },
    })) as RevertModelSnapshotResponse;

    // create calendar (if specified) and replay datafeed
    if (replay && model.snapshot_id === snapshotId && snapshot.model_snapshots.length) {
      // create calendar before starting restarting the datafeed
      if (calendarEvents !== undefined && calendarEvents.length) {
        const calendar: FormCalendar = {
          calendarId: String(Date.now()),
          job_ids: [jobId],
          description: i18n.translate(
            'xpack.ml.models.jobService.revertModelSnapshot.autoCreatedCalendar.description',
            {
              defaultMessage: 'Auto created',
            }
          ),
          events: calendarEvents.map((s) => ({
            description: s.description,
            start_time: s.start,
            end_time: s.end,
          })),
        };
        const cm = new CalendarManager(mlClusterClient);
        await cm.newCalendar(calendar);
      }

      forceStartDatafeeds([datafeedId], snapshot.model_snapshots[0].latest_record_time_stamp, end);
    }

    return { success: true };
  }

  return { revertModelSnapshot };
}
