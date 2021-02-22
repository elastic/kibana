/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { CaseStatuses } from '../../../../../case/common/api';
import * as i18n from './translations';

type Statuses = Record<
  CaseStatuses,
  {
    color: string;
    label: string;
    icon: EuiIconType;
    actions: {
      bulk: {
        title: string;
      };
      single: {
        title: string;
        description?: string;
      };
    };
    actionBar: {
      title: string;
    };
    button: {
      label: string;
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
    icon: 'folderOpen' as const,
    actions: {
      bulk: {
        title: i18n.BULK_ACTION_OPEN_SELECTED,
      },
      single: {
        title: i18n.OPEN_CASE,
      },
    },
    actionBar: {
      title: i18n.CASE_OPENED,
    },
    button: {
      label: i18n.REOPEN_CASE,
    },
    stats: {
      title: i18n.OPEN_CASES,
    },
  },
  [CaseStatuses['in-progress']]: {
    color: 'warning',
    label: i18n.IN_PROGRESS,
    icon: 'folderExclamation' as const,
    actions: {
      bulk: {
        title: i18n.BULK_ACTION_MARK_IN_PROGRESS,
      },
      single: {
        title: i18n.MARK_CASE_IN_PROGRESS,
      },
    },
    actionBar: {
      title: i18n.CASE_IN_PROGRESS,
    },
    button: {
      label: i18n.MARK_CASE_IN_PROGRESS,
    },
    stats: {
      title: i18n.IN_PROGRESS_CASES,
    },
  },
  [CaseStatuses.closed]: {
    color: 'default',
    label: i18n.CLOSED,
    icon: 'folderClosed' as const,
    actions: {
      bulk: {
        title: i18n.BULK_ACTION_CLOSE_SELECTED,
      },
      single: {
        title: i18n.CLOSE_CASE,
      },
    },
    actionBar: {
      title: i18n.CASE_CLOSED,
    },
    button: {
      label: i18n.CLOSE_CASE,
    },
    stats: {
      title: i18n.CLOSED_CASES,
    },
  },
};
