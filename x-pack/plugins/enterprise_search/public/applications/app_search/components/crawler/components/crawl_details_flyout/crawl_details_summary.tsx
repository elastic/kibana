/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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
  crawlerLogsEnabled: boolean;
  domainCount: number;
  stats: CrawlRequestStats | null;
}

export const CrawlDetailsSummary: React.FC<ICrawlerSummaryProps> = ({
  crawlDepth,
  crawlType,
  crawlerLogsEnabled,
  domainCount,
  stats,
}) => {
  const duration = () => {
    if (stats && stats.status && stats.status.crawlDurationMSec) {
      const milliseconds = moment.duration(stats.status.crawlDurationMSec, 'milliseconds');
      const hours = milliseconds.hours();
      const minutes = milliseconds.minutes();
      const seconds = milliseconds.seconds();
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return '--';
    }
  };

  const getStatusCount = (code: string, codes: { [code: string]: number }) => {
    return Object.entries(codes).reduce((count, [k, v]) => {
      if (k[0] !== code) return count;
      return v + count;
    }, 0);
  };

  const statusCounts = {
    clientErrorCount:
      stats && stats.status && stats.status.statusCodes
        ? getStatusCount('4', stats.status.statusCodes)
        : 0,
    serverErrorCount:
      stats && stats.status && stats.status.statusCodes
        ? getStatusCount('5', stats.status.statusCodes)
        : 0,
  };

  const shouldHideStats = !crawlerLogsEnabled && !stats;

  return (
    <EuiPanel paddingSize="l" color="primary">
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiStat
            data-test-subjet="crawlType"
            titleSize="s"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.components.crawlDetailsSummary.crawlCountOnDomains',
              {
                defaultMessage:
                  '{crawlType} crawl on {domainCount, plural, one {# domain} other {# domains}}',
                values: {
                  crawlType: crawlType[0].toUpperCase() + crawlType.substring(1),
                  domainCount,
                },
              }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.components.crawlDetailsSummary.crawlTypeLabel',
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
              'xpack.enterpriseSearch.appSearch.crawler.components.crawlDetailsSummary.crawlDepthLabel',
              {
                defaultMessage: 'Max crawl depth',
              }
            )}
          />
        </EuiFlexItem>
        {!shouldHideStats && (
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
      {!shouldHideStats ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiStat
              data-test-subj="urlsAllowed"
              titleSize="s"
              title={
                stats && stats.status && stats.status.urlsAllowed ? stats.status.urlsAllowed : '--'
              }
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
              title={
                stats && stats.status && stats.status.pagesVisited
                  ? stats.status.pagesVisited
                  : '--'
              }
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
                stats && stats.status && stats.status.avgResponseTimeMSec
                  ? `${Math.round(stats.status.avgResponseTimeMSec)}ms`
                  : '--'
              }
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.avgResponseTimeLabel',
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
              title={statusCounts.clientErrorCount}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.clientErrorsLabel',
                {
                  defaultMessage: '4xx Errors',
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              data-test-subj="serverErrors"
              titleSize="s"
              title={statusCounts.serverErrorCount}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.serverErrorsLabel',
                {
                  defaultMessage: '5xx Errors',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" textAlign="center" data-test-subj="logsDisabledMessage">
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.logsDisabledMessage',
              {
                defaultMessage:
                  'Enable Web Crawler logs in settings for more detailed crawl statistics.',
              }
            )}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
