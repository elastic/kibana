/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import moment from 'moment';

import {
  EuiPanel,
  EuiHorizontalRule,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiStat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlRequestStats } from '../../types';

interface ICrawlerSummaryProps {
  stats: CrawlRequestStats;
  crawlType: string;
  domainCount: number;
  crawlDepth: number;
}

export const CrawlDetailsSummary: React.FC<ICrawlerSummaryProps> = ({
  crawlDepth,
  crawlType,
  domainCount,
  stats,
}) => {
  const [statusCounts, setStatusCounts] = useState<{ [code: string]: number }>({});

  const duration = () => {
    const duration = moment.duration(stats.status.crawlDurationMSec, 'milliseconds');
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getStatusCount = (code: string, codes: any) => {
    let count = 0;
    Object.keys(codes).filter((key) => {
      if (key[0] === code) {
        count += codes[key];
      }
    })
    return count;
  }

  useEffect(() => {
    if (stats.status.statusCodes) {
      setStatusCounts({
        client_error_count: getStatusCount('4', stats.status.statusCodes),
        server_error_count: getStatusCount('5', stats.status.statusCodes),
      })
    }
  }, [])

  return (
    <EuiPanel paddingSize="l" color="primary">
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiStat
            titleSize="s"
            title={`${
              crawlType[0].toUpperCase() + crawlType.substring(1)
            } crawl on ${domainCount} ${domainCount === 1 ? 'domain' : 'domains'}`}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.components.crawlDetailsSummary.crawlType',
              {
                defaultMessage: 'Crawl type',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiStat
            titleSize="s"
            title={crawlDepth}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.components.crawlDetailsSummary.crawlDepth',
              {
                defaultMessage: 'Max crawl depth',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={duration()}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.durationTooltipTitle',
              {
                defaultMessage: 'Duration',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={stats.status.urlsAllowed}
            description={
              <EuiText size="s">
                URLs{' '}
                <EuiIconTip
                  type="iInCircle"
                  color="primary"
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.urlsTooltipTitle',
                    {
                      defaultMessage: 'URLs Seen',
                    }
                  )}
                  content={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.urlsTooltip',
                    {
                      defaultMessage:
                        'URLs found by the crawler during the crawl, including those not followed due to the crawl configuration.',
                    }
                  )}
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={stats.status.pagesVisited}
            description={
              <EuiText size="s">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesVisitedTooltipTitle',
                  {
                    defaultMessage: 'Pages',
                  }
                )}
                {' '}
                <EuiIconTip
                  type="iInCircle"
                  color="primary"
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesTooltipTitle',
                    {
                      defaultMessage: 'Pages visited',
                    }
                  )}
                  content={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesTooltip',
                    {
                      defaultMessage: 'URLs visited and extracted during the crawl.',
                    }
                  )}
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={
              stats.status.avgResponseTimeMSec
                ? `${Math.round(stats.status.avgResponseTimeMSec)}ms`
                : 'N/A'
            }
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.avgResponseTimeTooltipTitle',
              {
                defaultMessage: 'Avg. response',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={statusCounts.client_error_count ? statusCounts.client_error_count : 0}
            description={`4xx ${i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.serverErrors',
              {
                defaultMessage: 'Errors',
              }
            )}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={statusCounts.server_error_count ? statusCounts.server_error_count : 0}
            description={`5xx ${i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.serverErrors',
              {
                defaultMessage: 'Errors',
              }
            )}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
