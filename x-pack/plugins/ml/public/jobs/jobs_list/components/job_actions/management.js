/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPermission } from 'plugins/ml/privilege/check_privilege';
import { mlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';

import {
  stopDatafeeds,
  cloneJob,
  closeJobs,
  isStartable,
  isStoppable,
  isClosable,
} from '../utils';

export function actionsMenuContent(showEditJobFlyout, showDeleteJobModal, showStartDatafeedModal, refreshJobs) {
  const canCreateJob = (checkPermission('canCreateJob') && mlNodesAvailable());
  const canUpdateJob = checkPermission('canUpdateJob');
  const canDeleteJob = checkPermission('canDeleteJob');
  const canUpdateDatafeed = checkPermission('canUpdateDatafeed');
  const canStartStopDatafeed = (checkPermission('canStartStopDatafeed') && mlNodesAvailable());
  const canCloseJob = (checkPermission('canCloseJob') && mlNodesAvailable());

  return [
    {
      name: 'Start datafeed',
      description: 'Start datafeed',
      icon: 'play',
      enabled: () => (canStartStopDatafeed),
      available: (item) => (isStartable([item])),
      onClick: (item) => {
        showStartDatafeedModal([item]);
        closeMenu();
      }
    }, {
      name: 'Stop datafeed',
      description: 'Stop datafeed',
      icon: 'stop',
      enabled: () => (canStartStopDatafeed),
      available: (item) => (isStoppable([item])),
      onClick: (item) => {
        stopDatafeeds([item], refreshJobs);
        closeMenu(true);
      }
    }, {
      name: 'Close job',
      description: 'Close job',
      icon: 'cross',
      enabled: () => (canCloseJob),
      available: (item) => (isClosable([item])),
      onClick: (item) => {
        closeJobs([item], refreshJobs);
        closeMenu(true);
      }
    }, {
      name: 'Clone job',
      description: 'Clone job',
      icon: 'copy',
      enabled: () => (canCreateJob),
      onClick: (item) => {
        cloneJob(item.id);
        closeMenu(true);
      }
    }, {
      name: 'Edit job',
      description: 'Edit job',
      icon: 'pencil',
      enabled: () => (canUpdateJob && canUpdateDatafeed),
      onClick: (item) => {
        showEditJobFlyout(item);
        closeMenu();
      }
    }, {
      name: 'Delete job',
      description: 'Delete job',
      icon: 'trash',
      color: 'danger',
      enabled: () => (canDeleteJob),
      onClick: (item) => {
        showDeleteJobModal([item]);
        closeMenu();
      }
    }
  ];
}

function closeMenu(now = false) {
  if (now) {
    document.querySelector('.euiTable').click();
  } else {
    window.setTimeout(() => {
      const modalBody = document.querySelector('.euiModalBody');
      if (modalBody) {
        modalBody.click();
      } else {
        document.querySelector('.euiTable').click();
      }
    }, 500);
  }
}
