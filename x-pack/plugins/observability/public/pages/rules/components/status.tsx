/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { StatusProps } from '../types';
import { statusMap } from '../config';

export function Status({ type, onClick }: StatusProps) {
  return (
    <EuiBadge
      color={statusMap[type].color}
      iconType="arrowDown"
      iconSide="right"
      onClick={onClick}
      onClickAriaLabel="Change status"
    >
      {statusMap[type].label}
    </EuiBadge>
  );
}
