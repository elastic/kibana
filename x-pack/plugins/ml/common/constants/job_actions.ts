/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const JOB_ACTION = {
  DELETE: 'delete',
  RESET: 'reset',
  REVERT: 'revert',
} as const;

export type JobAction = typeof JOB_ACTION[keyof typeof JOB_ACTION];

export function getJobActionString(action: JobAction) {
  switch (action) {
    case JOB_ACTION.DELETE:
      return i18n.translate('xpack.ml.models.jobService.deletingJob', {
        defaultMessage: 'deleting',
      });
    case JOB_ACTION.RESET:
      return i18n.translate('xpack.ml.models.jobService.resettingJob', {
        defaultMessage: 'resetting',
      });
    case JOB_ACTION.REVERT:
      return i18n.translate('xpack.ml.models.jobService.revertingJob', {
        defaultMessage: 'reverting',
      });
    default:
      return '';
  }
}

export const JOB_ACTION_TASK: Record<string, JobAction> = {
  'cluster:admin/xpack/ml/job/delete': JOB_ACTION.DELETE,
  'cluster:admin/xpack/ml/job/reset': JOB_ACTION.RESET,
  'cluster:admin/xpack/ml/job/model_snapshots/revert': JOB_ACTION.REVERT,
};

export const JOB_ACTION_TASKS = Object.keys(JOB_ACTION_TASK);
