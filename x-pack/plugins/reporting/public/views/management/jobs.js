/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'angular-paging';
import 'plugins/reporting/services/job_queue';
import 'plugins/reporting/less/main.less';
import { Notifier } from 'ui/notify';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

import routes from 'ui/routes';
import template from 'plugins/reporting/views/management/jobs.html';
import { Poller } from '../../../../../common/poller';

const pageSize = 10;

function mapJobs(jobs) {
  return jobs.map((job) => {
    return {
      id: job._id,
      type: job._source.jobtype,
      object_type: job._source.payload.type,
      object_title: job._source.payload.title,
      created_by: job._source.created_by,
      created_at: job._source.created_at,
      started_at: job._source.started_at,
      completed_at: job._source.completed_at,
      status: job._source.status,
      content_type: job._source.output ? job._source.output.content_type : false,
      max_size_reached: job._source.output ? job._source.output.max_size_reached : false
    };
  });
}

routes.when('/management/kibana/reporting', {
  template,
  controllerAs: 'jobsCtrl',
  controller($scope, $route, $window, $interval, reportingJobQueue, kbnUrl, Private, reportingPollConfig) {
    const { jobsRefresh } = reportingPollConfig;
    const notifier = new Notifier({ location: 'Reporting' });
    const xpackInfo = Private(XPackInfoProvider);

    this.loading = false;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.reportingJobs = [];

    const licenseAllowsToShowThisPage = () => {
      return xpackInfo.get('features.reporting.management.showLinks')
        && xpackInfo.get('features.reporting.management.enableLinks');
    };

    const notifyAndRedirectToManagementOverviewPage = () => {
      notifier.error(xpackInfo.get('features.reporting.management.message'));
      kbnUrl.redirect('/management');
      return Promise.reject();
    };

    const getJobs = (page = 0) => {
      return reportingJobQueue.list(page)
        .then((jobs) => {
          return reportingJobQueue.total()
            .then((total) => {
              const mappedJobs = mapJobs(jobs);
              return {
                jobs: mappedJobs,
                total: total,
                pages: Math.ceil(total / pageSize),
              };
            });
        })
        .catch((err) => {
          if (!licenseAllowsToShowThisPage()) {
            return notifyAndRedirectToManagementOverviewPage();
          }

          if (err.status !== 401 && err.status !== 403) {
            notifier.error(err.statusText || 'Request failed');
          }

          return {
            jobs: [],
            total: 0,
            pages: 1,
          };
        });
    };

    const toggleLoading = () => {
      this.loading = !this.loading;
    };

    const updateJobs = () => {
      return getJobs(this.currentPage - 1)
        .then((jobs) => {
          this.reportingJobs = jobs;
        });
    };

    const updateJobsLoading = () => {
      toggleLoading();
      updateJobs().then(toggleLoading);
    };

    // pagination logic
    this.setPage = (page) => {
      this.currentPage = page;
    };

    // job list updating
    const poller = new Poller({
      functionToPoll: () => {
        return updateJobs();
      },
      pollFrequencyInMillis: jobsRefresh.interval,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: jobsRefresh.intervalErrorMultiplier
    });
    poller.start();

    // control handlers
    this.download = (jobId) => {
      $window.open(`../api/reporting/jobs/download/${jobId}`);
    };

    // fetch and show job error details
    this.showError = (jobId) => {
      reportingJobQueue.getContent(jobId)
        .then((doc) => {
          this.errorMessage = {
            job_id: jobId,
            message: doc.content,
          };
        });
    };

    $scope.$watch('jobsCtrl.currentPage', updateJobsLoading);

    $scope.$on('$destroy', () => poller.stop());
  }
});
