/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import capitalize from 'lodash/capitalize';
import React, { useMemo, VFC } from 'react';
import { EMPTY_VALUE } from '../../../../common/constants';

export interface TLPBadgeProps {
  value: string | undefined | null;
}

const LEVEL_TO_COLOR: Record<string, string> = {
  red: 'danger',
  amber: 'warning',
  'amber+strict': 'warning',
  green: 'success',
  white: 'hollow',
  clear: 'hollow',
} as const;

export const TLPBadge: VFC<TLPBadgeProps> = ({ value }) => {
  const normalizedValue = value?.toLowerCase().trim();
  const color = LEVEL_TO_COLOR[normalizedValue || ''];

  const displayValue = useMemo(
    () => normalizedValue?.replaceAll(/\W/g, ' ').split(' ').map(capitalize).join(' '),
    [normalizedValue]
  );

  if (!color) {
    return <>{EMPTY_VALUE}</>;
  }

  return <EuiBadge color={color}>{displayValue}</EuiBadge>;
};
