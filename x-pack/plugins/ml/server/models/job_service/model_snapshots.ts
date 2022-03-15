/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { IScopedClusterClient } from 'kibana/server';
import { ModelSnapshot } from '../../../common/types/anomaly_detection_jobs';
import { datafeedsProvider } from './datafeeds';
import { FormCalendar, CalendarManager } from '../calendar';
import type { MlClient } from '../../lib/ml_client';

export interface ModelSnapshotsResponse {
  count: number;
  model_snapshots: ModelSnapshot[];
}

export interface RevertModelSnapshotResponse {
  model: ModelSnapshot;
}

export function modelSnapshotProvider(client: IScopedClusterClient, mlClient: MlClient) {
  const { forceStartDatafeeds, getDatafeedIdsByJobId } = datafeedsProvider(client, mlClient);

  async function revertModelSnapshot(
    jobId: string,
    snapshotId: string,
    replay: boolean,
    end?: number,
    deleteInterveningResults: boolean = true,
    calendarEvents?: Array<{ start: number; end: number; description: string }>
  ) {
    let datafeedId = `datafeed-${jobId}`;
    // ensure job exists
    await mlClient.getJobs({ job_id: jobId });

    try {
      // ensure the datafeed exists
      // the datafeed is probably called datafeed-<jobId>
      await mlClient.getDatafeeds({
        datafeed_id: datafeedId,
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
    const snapshot = await mlClient.getModelSnapshots({
      job_id: jobId,
      snapshot_id: snapshotId,
    });

    // apply the snapshot revert
    const { model } = await mlClient.revertModelSnapshot({
      job_id: jobId,
      snapshot_id: snapshotId,
      body: {
        delete_intervening_results: deleteInterveningResults,
      },
    });

    // create calendar (if specified) and replay datafeed
    if (replay && model.snapshot_id === snapshotId && snapshot.model_snapshots.length) {
      // create calendar before starting restarting the datafeed
      if (calendarEvents !== undefined && calendarEvents.length) {
        const calendarId = String(Date.now());
        const calendar: FormCalendar = {
          calendarId,
          job_ids: [jobId],
          description: i18n.translate(
            'xpack.ml.models.jobService.revertModelSnapshot.autoCreatedCalendar.description',
            {
              defaultMessage: 'Auto created',
            }
          ),
          events: calendarEvents.map((s) => ({
            calendar_id: calendarId,
            description: s.description,
            start_time: `${s.start}`,
            end_time: `${s.end}`,
          })),
        };
        const cm = new CalendarManager(mlClient);
        await cm.newCalendar(calendar);
      }

      forceStartDatafeeds(
        [datafeedId],
        +snapshot.model_snapshots[0].latest_record_time_stamp!,
        end
      );
    }

    return { success: true };
  }

  return { revertModelSnapshot };
}
