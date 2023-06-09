/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiIconTip,
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../crawler_logic';
import { CrawlEvent, readableCrawlerStatuses } from '../types';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

const columns: Array<
  EuiTableFieldDataColumnType<CrawlEvent> | EuiTableComputedColumnType<CrawlEvent>
> = [
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
    render: (createdAt: CrawlEvent['createdAt']) => (
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
    align: 'right',
    render: (status: CrawlEvent['status'], event: CrawlEvent) => (
      <>
        {event.stage === 'process' && (
          <EuiIconTip
            aria-label="Process crawl"
            size="m"
            type="iInCircle"
            color="primary"
            position="top"
            content="Re-applied crawl rules"
          />
        )}
        {readableCrawlerStatuses[status]}
      </>
    ),
  },
];

export const CrawlRequestsTable: React.FC = () => {
  const { events } = useValues(CrawlerLogic);

  return (
    <EuiBasicTable
      columns={columns}
      items={events}
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
