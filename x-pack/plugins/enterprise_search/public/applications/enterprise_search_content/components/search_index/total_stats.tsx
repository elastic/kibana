/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiStatProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { OverviewLogic } from './overview.logic';

interface TotalStatsProps {
  additionalItems?: EuiStatProps[];
  ingestionType: string;
  lastUpdated?: string;
}

export const TotalStats: React.FC<TotalStatsProps> = ({ ingestionType, additionalItems = [] }) => {
  const { indexData, isSuccess } = useValues(OverviewLogic);
  const documentCount = indexData?.total.docs.count ?? 0;
  const isLoading = !isSuccess;
  const stats: EuiStatProps[] = [
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.ingestionTypeCardLabel',
        {
          defaultMessage: 'Ingestion type',
        }
      ),
      isLoading,
      title: ingestionType,
    },
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.documentCountCardLabel',
        {
          defaultMessage: 'Document count',
        }
      ),
      isLoading,
      title: documentCount,
    },
    ...additionalItems,
  ];

  return (
    <EuiFlexGroup direction="row">
      {stats.map((item, index) => (
        <EuiFlexItem key={index}>
          <EuiPanel color={index === 0 ? 'primary' : 'subdued'} hasShadow={false} paddingSize="l">
            <EuiStat {...item} />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
