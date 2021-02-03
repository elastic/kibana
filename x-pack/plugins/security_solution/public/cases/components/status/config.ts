/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CaseStatuses } from '../../../../../case/common/api';
import * as i18n from './translations';

type Statuses = Record<
  CaseStatuses,
  {
    color: string;
    label: string;
    actionBar: {
      title: string;
    };
    button: {
      label: string;
      icon: string;
    };
    stats: {
      title: string;
    };
  }
>;

export const statuses: Statuses = {
  [CaseStatuses.open]: {
    color: 'primary',
    label: i18n.OPEN,
    actionBar: {
      title: i18n.CASE_OPENED,
    },
    button: {
      label: i18n.REOPEN_CASE,
      icon: 'folderCheck',
    },
    stats: {
      title: i18n.OPEN_CASES,
    },
  },
  [CaseStatuses['in-progress']]: {
    color: 'warning',
    label: i18n.IN_PROGRESS,
    actionBar: {
      title: i18n.CASE_IN_PROGRESS,
    },
    button: {
      label: i18n.MARK_CASE_IN_PROGRESS,
      icon: 'folderExclamation',
    },
    stats: {
      title: i18n.IN_PROGRESS_CASES,
    },
  },
  [CaseStatuses.closed]: {
    color: 'default',
    label: i18n.CLOSED,
    actionBar: {
      title: i18n.CASE_CLOSED,
    },
    button: {
      label: i18n.CLOSE_CASE,
      icon: 'folderCheck',
    },
    stats: {
      title: i18n.CLOSED_CASES,
    },
  },
};
