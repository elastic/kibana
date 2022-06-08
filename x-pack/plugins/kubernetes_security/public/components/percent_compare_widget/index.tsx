/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useStyles } from './styles';

export interface PercentCompareWidgetData {
  name: string;
  value: number;
  fieldName: string;
  fieldValue: string | number | boolean;
  color: string;
}

export interface PercentCompareWidgetDeps {
  title: ReactNode;
  data: PercentCompareWidgetData[];
}

export const PercentCompareWidget = ({ title, data }: PercentCompareWidgetDeps) => {
  const styles = useStyles();
  const dataValueSum = data.reduce((sumSoFar, current) => sumSoFar + current.value, 0);
  return (
    <div css={styles.container}>
      <div css={styles.title}>{title}</div>
      <EuiFlexGroup direction="column" gutterSize="m">
        {data.map(({ name, value, fieldName, fieldValue, color }) => {
          return (
            <EuiFlexItem key={`percentage-compare-widget--${name}`}>
              <EuiText size="xs" css={styles.dataInfo}>
                {name}
                <span css={styles.dataValue}>{value}</span>
              </EuiText>
              <div css={styles.percentageBackground}>
                <div
                  css={{
                    ...styles.percentageBar,
                    width: `${(value / dataValueSum) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
