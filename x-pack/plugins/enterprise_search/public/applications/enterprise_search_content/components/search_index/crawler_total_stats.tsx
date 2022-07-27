/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from './crawler/crawler_logic';
import { TotalStats } from './total_stats';

export const CrawlerTotalStats: React.FC = () => {
  const { domains, dataLoading } = useValues(CrawlerLogic);

  const additionalItems = [
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.domainCountCardLabel',
        {
          defaultMessage: 'Domain count',
        }
      ),
      isLoading: dataLoading,
      title: domains.length,
    },
  ];

  return (
    <TotalStats
      ingestionType={i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.crawlerIngestionMethodLabel',
        {
          defaultMessage: 'Crawler',
        }
      )}
      additionalItems={additionalItems}
    />
  );
};
