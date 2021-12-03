/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import moment from 'moment';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlRequestStats } from '../../types';

interface ICrawlerSummaryProps {
  crawlDepth: number;
  crawlType: string;
  crawlerLogsEnabled: boolean | undefined;
  domainCount: number;
  stats: CrawlRequestStats;
}

export const CrawlDetailsSummary: React.FC<ICrawlerSummaryProps> = ({
  crawlDepth,
  crawlType,
  crawlerLogsEnabled,
  domainCount,
  stats,
}) => {

  const duration = () => {
    if (stats.status && stats.status.crawlDurationMSec) {
      const milliseconds = moment.duration(stats.status.crawlDurationMSec, 'milliseconds');
      const hours = milliseconds.hours();
      const minutes = milliseconds.minutes();
      const seconds = milliseconds.seconds();
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return '--';
    }
  };

  const getStatusCount = (code: string, codes: any) => {
    let count = 0;
    Object.keys(codes).filter((key) => {
      if (key[0] === code) {
        count += codes[key];
      }
    });
    return count;
  };

  const [statusCounts] = useState<{ [code: string]: number }>({
    client_error_count:
      stats.status && stats.status.statusCodes ? getStatusCount('4', stats.status.statusCodes) : 0,
    server_error_count:
      stats.status && stats.status.statusCodes ? getStatusCount('5', stats.status.statusCodes) : 0,
  });

  return (
    <EuiPanel paddingSize="l" color="primary">
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiStat
            data-test-subjet="crawlType"
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
            data-test-subj="crawlDepth"
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
        {crawlerLogsEnabled && (
          <EuiFlexItem grow={false}>
            <EuiStat
              data-test-subj="crawlDuration"
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
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {crawlerLogsEnabled ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiStat
              data-test-subj="urlsAllowed"
              titleSize="s"
              title={stats.status && stats.status.urlsAllowed ? stats.status.urlsAllowed : '--'}
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
              data-test-subj="pagesVisited"
              titleSize="s"
              title={stats.status && stats.status.pagesVisited ? stats.status.pagesVisited : '--'}
              description={
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesVisitedTooltipTitle',
                    {
                      defaultMessage: 'Pages',
                    }
                  )}{' '}
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
              data-test-subj="avgResponseTime"
              titleSize="s"
              title={
                stats.status && stats.status.avgResponseTimeMSec
                  ? `${Math.round(stats.status.avgResponseTimeMSec)}ms`
                  : '--'
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
              data-test-subj="clientErrors"
              titleSize="s"
              title={statusCounts.client_error_count}
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
              data-test-subj="serverErrors"
              titleSize="s"
              title={statusCounts.server_error_count}
              description={`5xx ${i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.serverErrors',
                {
                  defaultMessage: 'Errors',
                }
              )}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" textAlign="center">
          <EuiSpacer size="m" />
          <p>Enable Web Crawler logs in settings for more detailed crawl statistics.</p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
