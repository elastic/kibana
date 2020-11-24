/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';

import { CaseStatus } from '../../../../../case/common/api';
import * as i18n from './translations';

interface Props {
  type: CaseStatus;
  asContextMenu?: boolean;
}

type Statuses = Record<
  CaseStatus,
  {
    color: string;
    label: string;
  }
>;

const statuses: Statuses = {
  open: {
    color: 'primary',
    label: i18n.OPEN,
  },
  'in-progress': {
    color: 'warning',
    label: i18n.IN_PROGRESS,
  },
  closed: {
    color: 'default',
    label: i18n.CLOSED,
  },
};

const StatusComponent: React.FC<Props> = ({ type, asContextMenu = false }) => {
  const props = useMemo(
    () => ({
      color: statuses[type].color,
      ...(asContextMenu ? { iconType: 'cross', iconSide: 'right' as const } : {}),
    }),
    [asContextMenu, type]
  );

  return <EuiBadge {...props}>{statuses[type].label}</EuiBadge>;
};

export const Status = memo(StatusComponent);
