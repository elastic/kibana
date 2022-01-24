/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { EuiBadge } from '@elastic/eui';

import { allCaseStatus, statuses } from './config';
import * as i18n from './translations';
import { CaseStatusWithAllStatus, StatusAll } from '../../../common/ui/types';

interface Props {
  disabled?: boolean;
  type: CaseStatusWithAllStatus;
  withArrow?: boolean;
  onClick?: () => void;
}

const StatusComponent: React.FC<Props> = ({
  type,
  disabled = false,
  withArrow = false,
  onClick = noop,
}) => {
  const props = useMemo(
    () => ({
      color: type === StatusAll ? allCaseStatus[StatusAll].color : statuses[type].color,
      // if we are disabled, don't show the arrow and don't allow the user to click
      ...(withArrow && !disabled ? { iconType: 'arrowDown', iconSide: 'right' as const } : {}),
      ...(!disabled ? { iconOnClick: onClick } : { iconOnClick: noop }),
    }),
    [disabled, onClick, withArrow, type]
  );

  return (
    <EuiBadge
      {...props}
      iconOnClickAriaLabel={i18n.STATUS_ICON_ARIA}
      data-test-subj={`status-badge-${type}`}
    >
      {type === StatusAll ? allCaseStatus[StatusAll].label : statuses[type].label}
    </EuiBadge>
  );
};
StatusComponent.displayName = 'Status';

export const Status = memo(StatusComponent);
