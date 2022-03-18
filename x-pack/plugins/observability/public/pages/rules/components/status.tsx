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

export function Status({ type, disabled, onClick }: StatusProps) {
  console.log(disabled, '!!disabled');
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
    <EuiBadge {...props} onClickAriaLabel="Change status" iconOnClickAriaLabel="Change status">
      {statusMap[type].label}
    </EuiBadge>
  );
  /* <EuiBadge
      color={statusMap[type].color}
      iconType={!disabled ? 'arrowDown' : {}}
      iconSide="right"
      onClick={onClick}
      iconOnClick={!disabled ? onClick : noop}
      onClickAriaLabel="Change status"
    >
      {statusMap[type].label}
  </EuiBadge> 
  };*/
}
