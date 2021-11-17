/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiBadge, EuiBasicTable, EuiEmptyPrompt, EuiTableFieldDataColumnType } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../crawler_logic';
import { CrawlEvent, CrawlType, readableCrawlerStatuses, readableCrawlTypes } from '../types';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

const columns: Array<EuiTableFieldDataColumnType<CrawlEvent>> = [
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
    field: 'type',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.crawlType',
      {
        defaultMessage: 'Crawl Type',
      }
    ),
    render: (_, event: CrawlEvent) => <CrawlEventTypeBadge event={event} />,
  },
  {
    field: 'status',
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.status',
      {
        defaultMessage: 'Status',
      }
    ),
    render: (status: CrawlEvent['status']) => readableCrawlerStatuses[status],
  },
];

export const CrawlEventTypeBadge: React.FC<{ event: CrawlEvent }> = ({ event }) => {
  if (event.stage === 'process') {
    return (
      <EuiBadge color="hollow">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.reAppliedCrawlRules',
          {
            defaultMessage: 'Re-applied crawl rules',
          }
        )}
      </EuiBadge>
    );
  }
  if (event.type === CrawlType.Full) {
    return <EuiBadge>{readableCrawlTypes[CrawlType.Full]}</EuiBadge>;
  }
  if (event.type === CrawlType.Partial) {
    return <EuiBadge color="hollow">{readableCrawlTypes[CrawlType.Partial]}</EuiBadge>;
  }
  return null;
};

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
