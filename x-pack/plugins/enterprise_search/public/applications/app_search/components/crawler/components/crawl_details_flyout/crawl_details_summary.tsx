/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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
  const duration = () => {
    const duration = moment.duration(stats.status.crawlDurationMSec, 'milliseconds');
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <EuiPanel paddingSize="l" color="primary">
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiStat
            titleSize="s"
            title={`${
              crawlType[0].toUpperCase() + crawlType.substring(1)
            } crawl on ${domainCount} ${domainCount === 1 ? 'domain' : 'domains'}`}
            description="Crawl Type"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiStat titleSize="s" title={crawlDepth} description="Max Crawl Depth" />
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
                Pages{' '}
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
            description="Avg. Response"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat titleSize="s" title={duration()} description="Duration" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
