/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiBasicTable, EuiEmptyPrompt, EuiTableFieldDataColumnType } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerOverviewLogic } from '../crawler_overview_logic';
import { CrawlRequest, readableCrawlerStatuses } from '../types';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

const columns: Array<EuiTableFieldDataColumnType<CrawlRequest>> = [
  {
    field: 'id',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.domainURL',
      {
        defaultMessage: 'Request ID',
      }
    ),
  },
  {
    field: 'createdAt',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.created',
      {
        defaultMessage: 'Created',
      }
    ),
    render: (createdAt: CrawlRequest['createdAt']) => (
      <CustomFormattedTimestamp timestamp={createdAt} />
    ),
  },
  {
    field: 'status',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.status',
      {
        defaultMessage: 'Status',
      }
    ),
    render: (status: CrawlRequest['status']) => readableCrawlerStatuses[status],
  },
];

export const CrawlRequestsTable: React.FC = () => {
  const { crawlRequests } = useValues(CrawlerOverviewLogic);

  return (
    <EuiBasicTable
      columns={columns}
      items={crawlRequests}
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="tableDensityExpanded"
          title={
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.emptyPrompt.title',
                {
                  defaultMessage: 'No recent crawl requests',
                }
              )}
            </h3>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.emptyPrompt.body',
                {
                  defaultMessage: "You haven't started any crawls yet.",
                }
              )}
            </p>
          }
        />
      }
    />
  );
};
