/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiBasicTable,
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlDetailLogic } from '../crawl_detail_logic';
import { CrawlerLogic } from '../crawler_logic';
import { CrawlEvent, readableCrawlerStatuses } from '../types';

import { CrawlEventTypeBadge } from './crawl_event_type_badge';
import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

export const CrawlRequestsTable: React.FC = () => {
  const { events } = useValues(CrawlerLogic);
  const { fetchCrawlRequest, openFlyout } = useActions(CrawlDetailLogic);

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
      render: (id: string, event: CrawlEvent) => {
        if (event.stage === 'crawl') {
          return (
            <EuiLink
              onClick={() => {
                fetchCrawlRequest(id);
                openFlyout();
              }}
            >
              {id}
            </EuiLink>
          );
        }
        return <span>{id}</span>;
      },
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
          defaultMessage: 'Crawl type',
        }
      ),
      render: (_, event: CrawlEvent) => <CrawlEventTypeBadge event={event} />,
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.column.domains',
        {
          defaultMessage: 'Domains',
        }
      ),
      render: (event: CrawlEvent) => (
        <EuiBadge>{event.crawlConfig.domainAllowlist.length}</EuiBadge>
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
      render: (status: CrawlEvent['status']) => readableCrawlerStatuses[status],
    },
  ];

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
