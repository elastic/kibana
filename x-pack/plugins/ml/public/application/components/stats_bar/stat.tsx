/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface StatsBarStat {
  label: string;
  value: number;
  show?: boolean;
  'data-test-subj'?: string;
}
interface StatProps {
  stat: StatsBarStat;
}

export const Stat: FC<StatProps> = ({ stat }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span css={{ marginRight: euiTheme.size.s }}>
      <span>{stat.label}</span>:{' '}
      <strong data-test-subj={stat['data-test-subj']}>{stat.value}</strong>
    </span>
  );
};
