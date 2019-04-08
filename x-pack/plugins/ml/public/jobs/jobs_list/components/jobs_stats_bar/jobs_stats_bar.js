/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { JOB_STATE, DATAFEED_STATE } from 'plugins/ml/../common/constants/states';

import PropTypes from 'prop-types';
import React from 'react';
import { i18n } from '@kbn/i18n';

function createJobStats(jobsSummaryList) {

  const jobStats = {
    activeNodes: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.activeMLNodesLabel', {
        defaultMessage: 'Active ML Nodes'
      }),
      value: 0,
      show: true
    },
    total: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.totalJobsLabel', {
        defaultMessage: 'Total jobs'
      }),
      value: 0,
      show: true
    },
    open: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.openJobsLabel', {
        defaultMessage: 'Open jobs'
      }),
      value: 0,
      show: true
    },
    closed: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.closedJobsLabel', {
        defaultMessage: 'Closed jobs'
      }),
      value: 0,
      show: true
    },
    failed: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.failedJobsLabel', {
        defaultMessage: 'Failed jobs'
      }),
      value: 0,
      show: false
    },
    activeDatafeeds: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.activeDatafeedsLabel', {
        defaultMessage: 'Active datafeeds'
      }),
      value: 0,
      show: true
    }
  };

  if (jobsSummaryList === undefined) {
    return jobStats;
  }

  // object to keep track of nodes being used by jobs
  const mlNodes = {};
  let failedJobs = 0;

  jobsSummaryList.forEach((job) => {
    if (job.jobState === JOB_STATE.OPENED) {
      jobStats.open.value++;
    } else if (job.jobState === JOB_STATE.CLOSED) {
      jobStats.closed.value++;
    } else if (job.jobState === JOB_STATE.FAILED) {
      failedJobs++;
    }

    if (job.hasDatafeed && job.datafeedState === DATAFEED_STATE.STARTED) {
      jobStats.activeDatafeeds.value++;
    }

    if (job.nodeName !== undefined) {
      mlNodes[job.nodeName] = {};
    }
  });

  jobStats.total.value = jobsSummaryList.length;

  // // Only show failed jobs if it is non-zero
  if (failedJobs) {
    jobStats.failed.value = failedJobs;
    jobStats.failed.show = true;
  } else {
    jobStats.failed.show = false;
  }

  jobStats.activeNodes.value = Object.keys(mlNodes).length;

  return jobStats;
}

function Stat({ stat }) {
  return (
    <span className="stat">
      <span className="stat-label">{stat.label}</span>: <span className="stat-value">{stat.value}</span>
    </span>
  );
}
Stat.propTypes = {
  stat: PropTypes.object.isRequired,
};

export const JobStatsBar = ({ jobsSummaryList }) => {
  const jobStats = createJobStats(jobsSummaryList);
  const stats = Object.keys(jobStats).map(k => jobStats[k]);

  return (
    <div className="jobs-stats-bar">
      {
        stats.filter(s => (s.show)).map(s => <Stat key={s.label} stat={s} />)
      }
    </div>
  );
};

JobStatsBar.propTypes = {
  jobsSummaryList: PropTypes.array.isRequired,
};

