/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiStatProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from './crawler/crawler_logic';
import { NameAndDescriptionStats } from './name_and_description_stats';
import { OverviewLogic } from './overview.logic';

export const CrawlerTotalStats: React.FC = () => {
  const { domains, dataLoading } = useValues(CrawlerLogic);
  const { indexData, isError, isLoading } = useValues(OverviewLogic);
  const documentCount = indexData?.count ?? 0;
  const hideStats = isLoading || isError;

  const stats: EuiStatProps[] = [
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.ingestionTypeCardLabel',
        {
          defaultMessage: 'Ingestion type',
        }
      ),
      isLoading: hideStats,
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.crawlerIngestionMethodLabel',
        {
          defaultMessage: 'Crawler',
        }
      ),
    },
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.domainCountCardLabel',
        {
          defaultMessage: 'Domain count',
        }
      ),
      isLoading: dataLoading || hideStats,
      title: domains.length,
    },
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.documentCountCardLabel',
        {
          defaultMessage: 'Document count',
        }
      ),
      isLoading: hideStats,
      title: documentCount,
    },
  ];

  return (
    <>
      <NameAndDescriptionStats />
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        {stats.map((item, index) => (
          <EuiFlexItem key={index}>
            <EuiPanel color={index === 0 ? 'primary' : 'subdued'} hasShadow={false} paddingSize="l">
              <EuiStat {...item} />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
