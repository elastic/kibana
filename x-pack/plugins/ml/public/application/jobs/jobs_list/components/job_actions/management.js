/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';
import { getIndexPatternNames } from '../../../../util/index_utils';

import { stopDatafeeds, cloneJob, closeJobs, isStartable, isStoppable, isClosable } from '../utils';
import { i18n } from '@kbn/i18n';

export function actionsMenuContent(
  showEditJobFlyout,
  showDeleteJobModal,
  showStartDatafeedModal,
  refreshJobs
) {
  const canCreateJob = checkPermission('canCreateJob') && mlNodesAvailable();
  const canUpdateJob = checkPermission('canUpdateJob');
  const canDeleteJob = checkPermission('canDeleteJob');
  const canUpdateDatafeed = checkPermission('canUpdateDatafeed');
  const canStartStopDatafeed = checkPermission('canStartStopDatafeed') && mlNodesAvailable();
  const canCloseJob = checkPermission('canCloseJob') && mlNodesAvailable();

  return [
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.startDatafeedLabel', {
        defaultMessage: 'Start datafeed',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.startDatafeedDescription', {
        defaultMessage: 'Start datafeed',
      }),
      icon: 'play',
      enabled: (item) => item.deleting !== true && canStartStopDatafeed,
      available: (item) => isStartable([item]),
      onClick: (item) => {
        showStartDatafeedModal([item]);
        closeMenu();
      },
      'data-test-subj': 'mlActionButtonStartDatafeed',
    },
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.stopDatafeedLabel', {
        defaultMessage: 'Stop datafeed',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.stopDatafeedDescription', {
        defaultMessage: 'Stop datafeed',
      }),
      icon: 'stop',
      enabled: (item) => item.deleting !== true && canStartStopDatafeed,
      available: (item) => isStoppable([item]),
      onClick: (item) => {
        stopDatafeeds([item], refreshJobs);
        closeMenu(true);
      },
      'data-test-subj': 'mlActionButtonStopDatafeed',
    },
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.closeJobLabel', {
        defaultMessage: 'Close job',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.closeJobDescription', {
        defaultMessage: 'Close job',
      }),
      icon: 'cross',
      enabled: (item) => item.deleting !== true && canCloseJob,
      available: (item) => isClosable([item]),
      onClick: (item) => {
        closeJobs([item], refreshJobs);
        closeMenu(true);
      },
      'data-test-subj': 'mlActionButtonCloseJob',
    },
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.cloneJobLabel', {
        defaultMessage: 'Clone job',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.cloneJobDescription', {
        defaultMessage: 'Clone job',
      }),
      icon: 'copy',
      enabled: (item) => {
        // We only allow cloning of a job if the user has the right permissions and can still access
        // the indexPattern the job was created for. An indexPattern could either have been deleted
        // since the the job was created or the current user doesn't have the required permissions to
        // access the indexPattern.
        const indexPatternNames = getIndexPatternNames();
        const jobIndicesAvailable = item.datafeedIndices.every((dfiName) => {
          return indexPatternNames.some((ipName) => ipName === dfiName);
        });

        return item.deleting !== true && canCreateJob && jobIndicesAvailable;
      },
      onClick: (item) => {
        cloneJob(item.id);
        closeMenu(true);
      },
      'data-test-subj': 'mlActionButtonCloneJob',
    },
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.editJobLabel', {
        defaultMessage: 'Edit job',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.editJobDescription', {
        defaultMessage: 'Edit job',
      }),
      icon: 'pencil',
      enabled: (item) => item.deleting !== true && canUpdateJob && canUpdateDatafeed,
      onClick: (item) => {
        showEditJobFlyout(item);
        closeMenu();
      },
      'data-test-subj': 'mlActionButtonEditJob',
    },
    {
      name: i18n.translate('xpack.ml.jobsList.managementActions.deleteJobLabel', {
        defaultMessage: 'Delete job',
      }),
      description: i18n.translate('xpack.ml.jobsList.managementActions.deleteJobDescription', {
        defaultMessage: 'Delete job',
      }),
      icon: 'trash',
      color: 'danger',
      enabled: () => canDeleteJob,
      onClick: (item) => {
        showDeleteJobModal([item]);
        closeMenu();
      },
      'data-test-subj': 'mlActionButtonDeleteJob',
    },
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
