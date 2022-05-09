/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CaseStatuses } from '@kbn/cases-plugin/common';
import { EuiBadge } from '@elastic/eui';

import * as i18n from '../translations';

interface Props {
  status: CaseStatuses;
}

const statuses = {
  [CaseStatuses.open]: {
    color: 'primary',
    label: i18n.STATUS_OPEN,
  },
  [CaseStatuses['in-progress']]: {
    color: 'warning',
    label: i18n.STATUS_IN_PROGRESS,
  },
  [CaseStatuses.closed]: {
    color: 'default',
    label: i18n.STATUS_CLOSED,
  },
} as const;

export const StatusBadge: React.FC<Props> = ({ status }) => {
  return (
    <EuiBadge color={statuses[status].color} data-test-subj="case-status-badge">
      {statuses[status].label}
    </EuiBadge>
  );
};

StatusBadge.displayName = 'StatusBadge';
