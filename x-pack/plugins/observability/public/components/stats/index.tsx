/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import React from 'react';
import { Stat } from '../../typings/data_handler';

interface Props {
  stats: Stat[];
  formatter?: (value: number) => string;
}

export const Stats = ({ stats, formatter }: Props) => {
  return (
    <EuiFlexGroup>
      {stats.map((stat) => {
        return (
          <EuiFlexItem key={stat.label} grow={false}>
            <EuiStat
              key={stat.label}
              title={formatter ? formatter(stat.value) : stat.value}
              description={stat.label}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
