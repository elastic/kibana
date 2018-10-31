/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { toastNotifications } from 'ui/notify';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { get } from 'lodash';
import { jobQueueClient } from 'plugins/reporting/lib/job_queue_client';
import { jobCompletionNotifications } from 'plugins/reporting/lib/job_completion_notifications';
import { PathProvider } from 'plugins/xpack_main/services/path';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { Poller } from '../../../../common/poller';
import {
  EuiButton,
} from '@elastic/eui';
import { downloadReport } from '../lib/download_report';

/**
 * Poll for changes to reports. Inform the user of changes when the license is active.
 */
uiModules.get('kibana')
  .run((Private, reportingPollConfig) => {
    // Don't show users any reporting toasts until they're logged in.
    if (Private(PathProvider).isUnauthenticated()) {
      return;
    }

    // We assume that all license types offer Reporting, and that we only need to check if the
    // license is active or expired.
    const xpackInfo = Private(XPackInfoProvider);
    const isLicenseActive = xpackInfo.getLicense().isActive;

    async function showCompletionNotification(job) {
      const reportObjectTitle = job._source.payload.title;
      const reportObjectType = job._source.payload.type;

      const isJobSuccessful = get(job, '_source.status') === 'completed';

      if (!isJobSuccessful) {
        const errorDoc = await jobQueueClient.getContent(job._id);
        const text = errorDoc.content;
        return toastNotifications.addDanger({
          title: `Couldn't create report for ${reportObjectType} '${reportObjectTitle}'`,
          text,
        });
      }

      let seeReportLink;

      // In-case the license expired/changed between the time they queued the job and the time that
      // the job completes, that way we don't give the user a toast to download their report if they can't.
      if (chrome.navLinkExists('kibana:management')) {
        const managementUrl = chrome.getNavLinkById('kibana:management').url;
        const reportingSectionUrl = `${managementUrl}/kibana/reporting`;
        seeReportLink = (
          <p>
            Pick it up from <a href={reportingSectionUrl}>Management &gt; Kibana &gt; Reporting</a>.
          </p>
        );
      }

      const downloadReportButton = (
        <EuiButton
          size="s"
          data-test-subj="downloadCompletedReportButton"
          onClick={() => { downloadReport(job._id); }}
        >
          Download report
        </EuiButton>
      );

      const maxSizeReached = get(job, '_source.output.max_size_reached');

      if (maxSizeReached) {
        return toastNotifications.addWarning({
          title: `Created partial report for ${reportObjectType} '${reportObjectTitle}'`,
          text: (
            <div>
              <p>The report reached the max size and contains partial data.</p>
              {seeReportLink}
              {downloadReportButton}
            </div>
          ),
          'data-test-subj': 'completeReportSuccess',
        });
      }

      toastNotifications.addSuccess({
        title: `Created report for ${reportObjectType} '${reportObjectTitle}'`,
        text: (
          <div>
            {seeReportLink}
            {downloadReportButton}
          </div>
        ),
        'data-test-subj': 'completeReportSuccess',
      });
    }

    const { jobCompletionNotifier } = reportingPollConfig;

    const poller = new Poller({
      functionToPoll: async () => {
        if (!isLicenseActive) {
          return;
        }

        const jobIds = jobCompletionNotifications.getAll();
        if (!jobIds.length) {
          return;
        }

        const jobs = await jobQueueClient.list(0, jobIds);
        jobIds.forEach(async jobId => {
          const job = jobs.find(j => j._id === jobId);
          if (!job) {
            jobCompletionNotifications.remove(jobId);
            return;
          }

          if (job._source.status === 'completed' || job._source.status === 'failed') {
            await showCompletionNotification(job);
            jobCompletionNotifications.remove(job.id);
            return;
          }
        });
      },
      pollFrequencyInMillis: jobCompletionNotifier.interval,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: jobCompletionNotifier.intervalErrorMultiplier
    });
    poller.start();
  });
