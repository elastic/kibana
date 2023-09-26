/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

export interface StatsBarStat {
  label: string;
  value: string | number;
  show?: boolean;
}
interface StatProps {
  stat: StatsBarStat;
}

export const Stat: FC<StatProps> = ({ stat }) => {
  return (
    <span className="transformStat">
      <span>{stat.label}</span>: <strong>{stat.value}</strong>
    </span>
  );
};
