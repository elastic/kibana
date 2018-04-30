/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { JobServiceProvider } from 'plugins/ml/services/job_service';
import { CreateWatchServiceProvider } from 'plugins/ml/jobs/new_job/simple/components/watcher/create_watch_service';

export function PostSaveServiceProvider(Private, mlMessageBarService, $q) {
  const msgs = mlMessageBarService;
  const mlJobService = Private(JobServiceProvider);
  const createWatchService = Private(CreateWatchServiceProvider);

  class PostSaveService {
    constructor() {
      this.STATUS = {
        SAVE_FAILED: -1,
        SAVING: 0,
        SAVED: 1,
      };

      this.status = {
        realtimeJob: null,
        watch: null
      };
      createWatchService.status = this.status;

      this.externalCreateWatch;
    }

    startRealtimeJob(jobId) {
      return $q((resolve, reject) => {
        this.status.realtimeJob = this.STATUS.SAVING;

        const datafeedId = mlJobService.getDatafeedId(jobId);

        mlJobService.openJob(jobId)
          .finally(() => {
            mlJobService.startDatafeed(datafeedId, jobId, 0, undefined)
              .then(() => {
                this.status.realtimeJob = this.STATUS.SAVED;
                resolve();
              }).catch((resp) => {
                msgs.error('Could not start datafeed: ', resp);
                this.status.realtimeJob = this.STATUS.SAVE_FAILED;
                reject();
              });
          });

      });
    }

    apply(jobId, runInRealtime, createWatch) {
      if (runInRealtime) {
        this.startRealtimeJob(jobId)
          .then(() => {
            if (createWatch) {
              createWatchService.createNewWatch(jobId);
            }
          });
      }
    }
  }

  return new PostSaveService();
}
