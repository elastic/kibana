/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

interface QuickStatsProps { }

interface BaseQuickStatProps {
  icon: string;
  iconColor: string;
  title: string;
  open: boolean;
  stats: Array<{
    title: string;
    value: number;
  }>;
}

const QuickStat: React.FC<BaseQuickStatProps> = ({ icon, title, stats }) => {
  return (
    <EuiPanel paddingSize="m" >
      <EuiAccordion
        id="1"
        buttonElement="div"
        buttonContent={
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color="primary" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>{title}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            {stats.map((stat, index) => (
              <p>
                {stat.title} - {stat.value}
              </p>
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
};

export const QuickStats: React.FC<QuickStatsProps> = () => {
  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <QuickStat
            icon="dot"
            iconColor="green"
            title="document count"
            stats={[{ title: 'Total', value: 42816 }]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
