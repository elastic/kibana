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
import { CaseStatusWithAllStatus, StatusAll } from '../../../common';

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
      isDisabled={disabled}
    >
      {type === StatusAll ? allCaseStatus[StatusAll].label : statuses[type].label}
    </EuiBadge>
  );
};

export const Status = memo(StatusComponent);
