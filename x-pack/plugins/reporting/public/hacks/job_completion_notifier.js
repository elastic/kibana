/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { toastNotifications } from 'ui/notify';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { addSystemApiHeader } from 'ui/system_api';
import { get } from 'lodash';
import {
  API_BASE_URL
} from '../../common/constants';
import 'plugins/reporting/services/job_queue';
import 'plugins/reporting/services/job_completion_notifications';
import { PathProvider } from 'plugins/xpack_main/services/path';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { Poller } from '../../../../common/poller';
import {
  EuiButton,
} from '@elastic/eui';

/**
 * Poll for changes to reports. Inform the user of changes when the license is active.
 */
uiModules.get('kibana')
  .run(($http, reportingJobQueue, Private, reportingPollConfig, reportingJobCompletionNotifications, i18n) => {
    // Don't show users any reporting toasts until they're logged in.
    if (Private(PathProvider).isLoginOrLogout()) {
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
        const errorDoc = await reportingJobQueue.getContent(job._id);
        const text = errorDoc.content;
        return toastNotifications.addDanger({
          title: i18n('xpack.reporting.jobComplitionNotifier.error.couldnotCreateReportTitle', {
            defaultMessage: 'Couldn\'t create report for {reportObjectType} \'{reportObjectTitle}\'',
            values: { reportObjectType, reportObjectTitle }
          }),
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
            {i18n('xpack.reporting.jobComplitionNotifier.reportLinkDescription', {
              defaultMessage: 'Pick it up from {reportingSectionUrl}.',
              values: { reportingSectionUrl: (<a href={reportingSectionUrl}>Management &gt; Kibana &gt; Reporting</a>) }
            })}
          </p>
        );
      }

      const downloadReportButton = (
        <EuiButton
          size="s"
          data-test-subj="downloadCompletedReportButton"
          onClick={() => { downloadReport(job._id); }}
        >
          {i18n('xpack.reporting.jobComplitionNotifier.dowloadReportButtonLabel', {
            defaultMessage: 'Download report'
          })}
        </EuiButton>
      );

      const maxSizeReached = get(job, '_source.output.max_size_reached');

      if (maxSizeReached) {
        return toastNotifications.addWarning({
          title: i18n('xpack.reporting.jobComplitionNotifier.maxSizeReached.partialReportTitle', {
            defaultMessage: 'Created partial report for {reportObjectType} \'{reportObjectTitle}\'',
            values: { reportObjectType, reportObjectTitle }
          }),
          text: (
            <div>
              <p>
                {i18n('xpack.reporting.jobComplitionNotifier.maxSizeReached.partialReportDescription', {
                  defaultMessage: 'The report reached the max size and contains partial data.'
                })}
              </p>
              {seeReportLink}
              {downloadReportButton}
            </div>
          ),
          'data-test-subj': 'completeReportSuccess',
        });
      }

      toastNotifications.addSuccess({
        title: i18n('xpack.reporting.jobComplitionNotifier.createdReportTitle', {
          defaultMessage: 'Created report for {reportObjectType} \'{reportObjectTitle}\'',
          values: { reportObjectType, reportObjectTitle }
        }),
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

        const jobIds = reportingJobCompletionNotifications.getAll();
        if (!jobIds.length) {
          return;
        }

        const jobs = await getJobs($http, jobIds);
        jobIds.forEach(async jobId => {
          const job = jobs.find(j => j._id === jobId);
          if (!job) {
            reportingJobCompletionNotifications.remove(jobId);
            return;
          }

          if (job._source.status === 'completed' || job._source.status === 'failed') {
            await showCompletionNotification(job);
            reportingJobCompletionNotifications.remove(job.id);
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

async function getJobs($http, jobs) {
  // Get all jobs in "completed" status since last check, sorted by completion time
  const apiBaseUrl = chrome.addBasePath(API_BASE_URL);

  // Only getting the first 10, to prevent URL overflows
  const url = `${apiBaseUrl}/jobs/list?ids=${jobs.slice(0, 10).join(',')}`;
  const headers = addSystemApiHeader({});
  const response = await $http.get(url, { headers });
  return response.data;
}

function downloadReport(jobId) {
  const apiBaseUrl = chrome.addBasePath(API_BASE_URL);
  const downloadLink = `${apiBaseUrl}/jobs/download/${jobId}`;
  window.open(downloadLink);
}

