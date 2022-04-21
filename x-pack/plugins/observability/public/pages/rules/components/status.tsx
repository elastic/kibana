/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { StatusProps } from '../types';
import { statusMap } from '../config';
import { RULES_CHANGE_STATUS } from '../translations';

export function Status({ type, disabled, onClick }: StatusProps) {
  const props = useMemo(
    () => ({
      color: statusMap[type].color,
      ...(!disabled ? { onClick } : { onClick: noop }),
      ...(!disabled ? { iconType: 'arrowDown', iconSide: 'right' as const } : {}),
      ...(!disabled ? { iconOnClick: onClick } : { iconOnClick: noop }),
    }),
    [disabled, onClick, type]
  );
  return (
    <EuiBadge
      {...props}
      onClickAriaLabel={RULES_CHANGE_STATUS}
      iconOnClickAriaLabel={RULES_CHANGE_STATUS}
    >
      {statusMap[type].label}
    </EuiBadge>
  );
}
