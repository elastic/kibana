/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { template } from 'lodash';
import { http } from '../../../../services/http_service';

import emailBody from './email.html';
import emailInfluencersBody from './email_influencers.html';
import { DEFAULT_WATCH_SEVERITY } from './select_severity';
import { watch } from './watch.js';
import { i18n } from '@kbn/i18n';
import { getBasePath, getApplication } from '../../../../util/dependency_cache';

const compiledEmailBody = template(emailBody);
const compiledEmailInfluencersBody = template(emailInfluencersBody);

const emailSection = {
  send_email: {
    throttle_period_in_millis: 900000, // 15m
    email: {
      profile: 'standard',
      to: [],
      subject: i18n.translate('xpack.ml.newJob.simple.watcher.email.mlWatcherAlertSubjectTitle', {
        defaultMessage: 'ML Watcher Alert',
      }),
      body: {
        html: '',
      },
    },
  },
};

// generate a random number between min and max
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function saveWatch(watchModel) {
  const path = `/api/watcher/watch/${watchModel.id}`;

  return http({
    path,
    method: 'PUT',
    body: JSON.stringify(watchModel.upstreamJSON),
  });
}

class CreateWatchService {
  constructor() {
    this.config = {};

    this.STATUS = {
      SAVE_FAILED: -1,
      SAVING: 0,
      SAVED: 1,
    };

    this.status = {
      realtimeJob: null,
      watch: null,
    };
  }

  reset() {
    this.status.realtimeJob = null;
    this.status.watch = null;

    this.config.id = '';
    this.config.includeEmail = false;
    this.config.email = '';
    this.config.interval = '20m';
    this.config.watcherEditURL = '';
    this.config.includeInfluencers = false;

    // Current implementation means that default needs to match that of the select severity control.
    const { display, val } = DEFAULT_WATCH_SEVERITY;
    this.config.threshold = { display, val };
  }

  createNewWatch = function (jobId) {
    return new Promise((resolve, reject) => {
      this.status.watch = this.STATUS.SAVING;
      if (jobId !== undefined) {
        const id = `ml-${jobId}`;
        this.config.id = id;

        // set specific properties of the the watch
        watch.input.search.request.body.query.bool.filter[0].term.job_id = jobId;
        watch.input.search.request.body.query.bool.filter[1].range.timestamp.gte = `now-${this.config.interval}`;
        watch.input.search.request.body.aggs.bucket_results.filter.range.anomaly_score.gte = this.config.threshold.val;

        if (this.config.includeEmail && this.config.email !== '') {
          const { getUrlForApp } = getApplication();
          const emails = this.config.email.split(',');
          emailSection.send_email.email.to = emails;

          // create the html by adding the variables to the compiled email body.
          emailSection.send_email.email.body.html = compiledEmailBody({
            serverAddress: getUrlForApp('ml', { absolute: true }),
            influencersSection:
              this.config.includeInfluencers === true
                ? compiledEmailInfluencersBody({
                    topInfluencersLabel: i18n.translate(
                      'xpack.ml.newJob.simple.watcher.email.topInfluencersLabel',
                      {
                        defaultMessage: 'Top influencers:',
                      }
                    ),
                  })
                : '',
            elasticStackMachineLearningAlertLabel: i18n.translate(
              'xpack.ml.newJob.simple.watcher.email.elasticStackMachineLearningAlertLabel',
              {
                defaultMessage: 'Elastic Stack Machine Learning Alert',
              }
            ),
            jobLabel: i18n.translate('xpack.ml.newJob.simple.watcher.email.jobLabel', {
              defaultMessage: 'Job',
            }),
            timeLabel: i18n.translate('xpack.ml.newJob.simple.watcher.email.timeLabel', {
              defaultMessage: 'Time',
            }),
            anomalyScoreLabel: i18n.translate(
              'xpack.ml.newJob.simple.watcher.email.anomalyScoreLabel',
              {
                defaultMessage: 'Anomaly score',
              }
            ),
            openInAnomalyExplorerLinkText: i18n.translate(
              'xpack.ml.newJob.simple.watcher.email.openInAnomalyExplorerLinkText',
              {
                defaultMessage: 'Click here to open in Anomaly Explorer.',
              }
            ),
            topRecordsLabel: i18n.translate(
              'xpack.ml.newJob.simple.watcher.email.topRecordsLabel',
              { defaultMessage: 'Top records:' }
            ),
          });

          // add email section to watch
          watch.actions.send_email = emailSection.send_email;
        }

        // set the trigger interval to be a random number between 60 and 120 seconds
        // this is to avoid all watches firing at once if the server restarts
        // and the watches synchronize
        const triggerInterval = randomNumber(60, 120);
        watch.trigger.schedule.interval = `${triggerInterval}s`;

        const watchModel = {
          id,
          upstreamJSON: {
            id,
            type: 'json',
            isNew: false, // Set to false, as we want to allow watches to be overwritten.
            isActive: true,
            watch,
          },
        };

        const basePath = getBasePath();
        if (id !== '') {
          saveWatch(watchModel)
            .then(() => {
              this.status.watch = this.STATUS.SAVED;
              this.config.watcherEditURL = `${basePath.get()}/app/management/insightsAndAlerting/watcher/watches/watch/${id}/edit?_g=()`;
              resolve({
                id,
                url: this.config.watcherEditURL,
              });
            })
            .catch((resp) => {
              this.status.watch = this.STATUS.SAVE_FAILED;
              reject(resp);
            });
        }
      } else {
        this.status.watch = this.STATUS.SAVE_FAILED;
        reject();
      }
    });
  };

  loadWatch(jobId) {
    const id = `ml-${jobId}`;
    const path = `/api/watcher/watch/${id}`;
    return http({
      path,
      method: 'GET',
    });
  }
}

export const mlCreateWatchService = new CreateWatchService();
