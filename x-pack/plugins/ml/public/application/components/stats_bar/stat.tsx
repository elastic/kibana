/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

export interface StatsBarStat {
  label: string;
  value: number;
  show?: boolean;
}
interface StatProps {
  stat: StatsBarStat;
}

export const Stat: FC<StatProps> = ({ stat }) => {
  return (
    <span className="stat">
      <span>{stat.label}</span>: <strong>{stat.value}</strong>
    </span>
  );
};
