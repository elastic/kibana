/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { EuiBadge } from '@elastic/eui';

import { CaseStatus } from '../../../../../case/common/api';
import * as i18n from './translations';

interface Props {
  type: CaseStatus;
  withArrow?: boolean;
  onClick?: () => void;
}

type Statuses = Record<
  CaseStatus,
  {
    color: string;
    label: string;
  }
>;

export const statuses: Statuses = {
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

const StatusComponent: React.FC<Props> = ({ type, withArrow = false, onClick = noop }) => {
  const props = useMemo(
    () => ({
      color: statuses[type].color,
      ...(withArrow ? { iconType: 'arrowDown', iconSide: 'right' as const } : {}),
    }),
    [withArrow, type]
  );

  return (
    <EuiBadge {...props} iconOnClick={onClick} iconOnClickAriaLabel={i18n.STATUS_ICON_ARIA}>
      {statuses[type].label}
    </EuiBadge>
  );
};

export const Status = memo(StatusComponent);
