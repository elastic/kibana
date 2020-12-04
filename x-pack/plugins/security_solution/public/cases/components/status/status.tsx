/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { EuiBadge } from '@elastic/eui';

import { CaseStatuses } from '../../../../../case/common/api';
import { statuses } from './config';
import * as i18n from './translations';

interface Props {
  type: CaseStatuses;
  withArrow?: boolean;
  onClick?: () => void;
}

const StatusComponent: React.FC<Props> = ({ type, withArrow = false, onClick = noop }) => {
  const props = useMemo(
    () => ({
      color: statuses[type].color,
      ...(withArrow ? { iconType: 'arrowDown', iconSide: 'right' as const } : {}),
    }),
    [withArrow, type]
  );

  return (
    <EuiBadge
      {...props}
      iconOnClick={onClick}
      iconOnClickAriaLabel={i18n.STATUS_ICON_ARIA}
      data-test-subj={`status-badge-${type}`}
    >
      {statuses[type].label}
    </EuiBadge>
  );
};

export const Status = memo(StatusComponent);
