/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiText,
  EuiIcon,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { mlJobService } from 'plugins/ml/services/job_service';

export function actionsMenuContent(showEditJobModal, showDeleteJobModal, showStartDatafeedModal, refreshJobs) {
  return [{
    render: (item) => {
      return (
        getStartStop(item, showStartDatafeedModal, refreshJobs)
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText onClick={() => cloneJob(item.id)}>
          <EuiIcon type="copy" />
          Clone job
        </MLText>
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText onClick={() => showEditJobModal(item)}>
          <EuiIcon type="copy" />
          Edit job
        </MLText>
      );
    }
  }, {
    render: (item) => {
      return (
        <MLText color="danger"  onClick={() => showDeleteJobModal(item)}>
          <EuiIcon type="trash" />
          Delete job
        </MLText>
      );
    }
  }];
}


function getStartStop(item, showStartDatafeedModal, refreshJobs) {
  if (item.datafeedState === 'stopped') {
    return (
      <MLText onClick={() => showStartDatafeedModal(item)}>
        <EuiIcon type="play" />
        Start datafeed
      </MLText>
    );
  }

  if (item.datafeedState === 'started') {
    return (
      <MLText onClick={() => stopDatafeed(item.id, refreshJobs)}>
        <EuiIcon type="stop" />
        Stop datafeed
      </MLText>
    );
  }
}

function stopDatafeed(jobId, finish) {
  const datafeedId = mlJobService.getDatafeedId(jobId);
  mlJobService.stopDatafeed(datafeedId, jobId).then(() => {
    finish();
  });
}

function cloneJob(jobId) {
  mlJobService.refreshJob(jobId)
  	.then(() => {
      mlJobService.currentJob =  mlJobService.getJob(jobId);
      window.location.href = `#/jobs/new_job/advanced`;
    })
    .catch(() => {
      toastNotifications.addDanger(`Could not clone ${jobId}, job could not be found`);
    });
}

// EuiText wrapper to stop event propagation so the menu items don't fire twice.
// this appears to be an issue with the EuiBasicTable actions col when specifying
// a custom render function which contains its own onClick
function MLText({ onClick, ...rest }) {
  const click = (e) => {
    e.stopPropagation();
    onClick();
  };
  return <EuiText onClick={click} {...rest} />;
}
