/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CaseStatuses } from '../../../../../case/common/api';
import * as i18n from './translations';
import { AllCaseStatus, Statuses, StatusAll } from './types';

export const allCaseStatus: AllCaseStatus = {
  [StatusAll]: { color: 'hollow', label: i18n.ALL },
};

export const statuses: Statuses = {
  [CaseStatuses.open]: {
    color: 'primary',
    label: i18n.OPEN,
    actionBar: {
      title: i18n.CASE_OPENED,
    },
    button: {
      label: i18n.REOPEN_CASE,
      icon: 'folderOpen' as const,
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
      icon: 'folderExclamation' as const,
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
      icon: 'folderCheck' as const,
    },
    stats: {
      title: i18n.CLOSED_CASES,
    },
  },
};
